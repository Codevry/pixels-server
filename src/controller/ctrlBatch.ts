import { ErrorObject } from "@/utils/errorObject.ts";
import Globals from "@/utils/globals.ts";
import type { TypeImageConversionParams } from "@/types/typeImage.ts";
import {
    createNameFromParams,
    validateImageExtension,
    validateQueryParams,
} from "@/utils/functions.ts";
import Silent from "@/utils/silent.ts";

export default class CtrlBatch {
    /**
     * Performs batch transformation and upload of images from a specified directory in storage.
     * Processes each image in the directory applying the specified transformations and tracks
     * progress using Redis with the provided token.
     *
     * @param {string} token - Unique identifier for tracking the batch processing progress.
     * @param {string} storageName - The name of the storage configuration to use (e.g., 's3_main').
     * @param {string} directoryPath - The directory path within the storage to list files from.
     * @param {TypeImageConversionParams} transformations - A JSON object of transformations to apply.
     * @returns {Promise<void>} This method doesn't return a value directly. Progress can be tracked using the token in Redis.
     */
    public async batchTransformAndUpload(
        token: string,
        storageName: string,
        directoryPath: string,
        transformations: Record<string, any>
    ): Promise<void> {
        // validate transformation
        const validateTransformations = validateQueryParams(transformations);

        // get storage manager
        const storageManager = Globals.storage[storageName];

        // check if manager is available
        if (!storageManager)
            throw new ErrorObject(400, `Storage '${storageName}' not found.`);

        // check if transformations are present
        if (!Object.keys(validateTransformations).length)
            throw new ErrorObject(400, "No transformations provided.");

        // get list of all files
        let files: string[] = [];
        try {
            // get all files in the directory
            files = await storageManager.listFiles(directoryPath);
            console.log(`Found ${files.length} files`);
        } catch (error) {
            console.log(error);
            throw new ErrorObject(
                500,
                `Failed to list files from storage '${storageName}': ${error}`
            );
        }

        // variables to handle progress
        let done = 0;
        let pending = files.length;
        const errors: any[] = [];

        // save in redis
        Silent(
            "createBatchProgress",
            Globals.ctrlRedis.saveProgress(token, { done, pending, errors })
        );

        // apply operation on each image
        for await (const filePath of files) {
            try {
                // Extract file extension and base name from the path
                const ext = filePath.split(".").pop() || "";
                const originalName =
                    filePath.split("/").pop()?.split(".")[0] || "";

                // make sure ext is present
                if (!ext)
                    throw new ErrorObject(400, "File extension is missing");

                // validate original extension
                const originalExtension = validateImageExtension(ext)!;

                // validate new extension (if present)
                const newExtension = validateImageExtension(
                    transformations.format
                );

                // New name (unique name) for parse operations
                const parsedName = createNameFromParams(
                    originalName,
                    newExtension || originalExtension,
                    transformations
                );

                // process the image
                await Globals.ctrlImage.processImage(
                    storageName,
                    filePath,
                    parsedName,
                    transformations,
                    originalExtension,
                    newExtension || originalExtension
                );
                done++;
                pending--;
                console.log(`Processed ${done}/${files.length} files`);
            } catch (error: any) {
                console.error(`Error processing file ${filePath}:`, error);
                errors.push({ filePath, error: error.message || error });
                pending--;
            } finally {
                // save in redis
                Silent(
                    "updateBatchProgress",
                    Globals.ctrlRedis.saveProgress(token, {
                        done,
                        pending,
                        errors,
                    })
                );
            }
        }
    }
}

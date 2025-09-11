/**
 * @file Controller for handling batch image processing operations.
 * This includes transforming and uploading images from a directory or a list of files
 * and tracking the progress of these batch operations.
 */

import { ErrorObject } from "@/utils/errorObject.ts";
import Globals from "@/utils/globals.ts";
import {
    createNameFromParams,
    validateImageExtension,
    validateQueryParams,
} from "@/utils/functions.ts";
import Silent from "@/utils/silent.ts";

/**
 * Controller class responsible for managing batch image processing tasks.
 * It orchestrates the transformation, upload, and progress tracking of multiple images.
 */
export default class CtrlBatch {
    /**
     * Helper function to process a list of files, applying transformations and updating progress.
     * Iterates through each file, applies image transformations, and uploads the result.
     * Progress and errors are saved to Redis using the provided token.
     * @param {string} token - Unique identifier for tracking the batch processing progress.
     * @param {string} storageName - The name of the storage configuration to use.
     * @param {string[]} files - Array of file paths to process.
     * @param {Record<string, any>} transformations - A JSON object of transformations to apply.
     * @returns {Promise<void>} - A Promise that resolves when all files have been processed.
     * @private
     */
    private async _processFiles(
        token: string,
        storageName: string,
        files: string[],
        transformations: Record<string, any>
    ): Promise<void> {
        // Initialize progress tracking variables for batch processing
        let done = 0;
        let pending = files.length;
        const errors: any[] = [];

        // Initialize progress tracking in Redis with initial values
        Silent(
            "createBatchProgress",
            Globals.ctrlRedis.saveProgress(token, { done, pending, errors })
        );

        // Process each file in the array sequentially
        for await (const filePath of files) {
            try {
                // check if extension is present
                if (!filePath.includes("."))
                    throw new ErrorObject(400, "File extension is missing");

                // Extract file extension and name from the file path
                const ext = filePath.split(".").pop() || "";
                const name = filePath.split("/").pop()?.split(".")[0] || "";
                const originalName = `${name}.${ext}`;

                // Validate and determine image extensions for processing
                const originalExtension = validateImageExtension(ext)!;
                const newExtension = validateImageExtension(
                    transformations.format
                );

                // Generate new filename based on transformation parameters
                const parsedName = createNameFromParams(
                    name,
                    newExtension || originalExtension,
                    transformations
                );

                // Process the image with specified transformations and upload
                await Globals.ctrlImage.processImage(
                    storageName,
                    filePath,
                    originalName,
                    parsedName,
                    transformations,
                    newExtension || originalExtension
                );
                // Update progress counters after successful processing
                done++;
                pending--;
                console.log(`Processed ${done}/${files.length} files`);
            } catch (error: any) {
                // Handle and log any errors during file processing
                console.error(`Error processing file ${filePath}:`, error);
                errors.push({ filePath, error: error.message || error });
                pending--;
            } finally {
                // Update progress tracking in Redis after each file
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

    /**
     * Performs batch transformation and upload of images from a specified directory in storage.
     * Processes each image in the directory applying the specified transformations and tracks
     * progress using Redis with the provided token.
     *
     * @param {string} token - Unique identifier for tracking the batch processing progress.
     * @param {string} storageName - The name of the storage configuration to use (e.g., 's3_main').
     * @param {string} directoryPath - The directory path within the storage to list files from.
     * @param {Record<string, any>} transformations - A JSON object of transformations to apply.
     * @returns {Promise<void>} This method doesn't return a value directly. Progress can be tracked using the token in Redis.
     * @throws {ErrorObject} - Throws an ErrorObject if the storage manager is not found, no transformations are provided,
     * or if listing files from storage fails.
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

        // call the helper to process files
        await this._processFiles(token, storageName, files, transformations);
    }

    /**
     * Performs batch transformation and upload of images from a given list of file paths.
     * Processes each image in the list applying the specified transformations and tracks
     * progress using Redis with the provided token.
     *
     * @param {string} token - Unique identifier for tracking the batch processing progress.
     * @param {string} storageName - The name of the storage configuration to use (e.g., 's3_main').
     * @param {string[]} filePaths - An array of file paths to perform operations on.
     * @param {Record<string, any>} transformations - A JSON object of transformations to apply.
     * @returns {Promise<void>} This method doesn't return a value directly. Progress can be tracked using the token in Redis.
     * @throws {ErrorObject} - Throws an ErrorObject if the storage manager is not found, no transformations are provided,
     * or if the filePaths array is empty.
     */
    public async batchTransformAndUploadFromList(
        token: string,
        storageName: string,
        filePaths: string[],
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

        // check if files array is not empty
        if (!filePaths.length)
            throw new ErrorObject(400, "No files provided for processing.");

        // call the helper to process files
        await this._processFiles(
            token,
            storageName,
            filePaths,
            transformations
        );
    }

    /**
     * Retrieves the current progress of a batch process from Redis.
     * @param {string} token - Unique identifier for the batch process.
     * @returns {Promise<object | null>} The progress object if found, otherwise null.
     */
    public async getBatchProgress(token: string): Promise<object | null> {
        return Globals.ctrlRedis.getProgress(token);
    }
}

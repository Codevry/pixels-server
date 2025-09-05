import SharpManager from "@/services/sharp.ts";
import { ErrorObject } from "@/utils/errorObject.ts";
import {
    createNameFromParams,
    validateImageExtension,
    validateQueryParams,
} from "@/utils/functions.ts";
import type { FormatEnum } from "sharp";
import type { TypeImageConversionParams } from "@/types/typeImage.ts";

export default class CtrlImage {
    /**
     * Dynamically applies image transformations based on a record of operations.
     * @param {Buffer} inputBuffer - The input image as a Buffer.
     * @param {Record<string, string>} operations - A record where keys are SharpManager method names and values are stringified arguments.
     * @param extension original image extension (from a path)
     * @returns {Promise<Buffer>} The processed image as a Buffer.
     * @throws {ErrorObject} If any operation fails or is unsupported.
     */
    async convertImage(
        inputBuffer: Buffer,
        operations: Partial<TypeImageConversionParams>,
        extension: keyof FormatEnum
    ): Promise<Buffer> {
        let sharpManager = new SharpManager(inputBuffer);

        // for resize handling
        if (operations.width || operations.height) {
            sharpManager.resize(operations.width, operations.height);
        }

        // handle various operations
        for (const [methodName, arg] of Object.entries(operations)) {
            try {
                switch (methodName) {
                    case "rotate":
                        sharpManager = sharpManager.rotate(arg as number);
                        break;
                    case "grayscale":
                        sharpManager = sharpManager.grayscale();
                        break;
                    case "blur":
                        sharpManager = sharpManager.blur(arg as number);
                        break;
                    case "flip":
                        sharpManager = sharpManager.flip();
                        break;
                    case "flop":
                        sharpManager = sharpManager.flop();
                        break;
                    case "tint":
                        sharpManager = sharpManager.tint(arg as string);
                        break;
                }
            } catch (error: any) {
                throw new ErrorObject(
                    400,
                    `Failed to apply operation '${methodName}': ${error.message}`
                );
            }
        }

        // Apply the format conversion at the end
        if (operations.format || operations.quality) {
            sharpManager.toFormat(
                extension,
                operations.quality ? Number(operations.quality) : undefined
            );
        }

        return await sharpManager.toBuffer();
    }

    /**
     * Processes an image based on its path, storage name, and query parameters.
     * @param {string} imagePath - The path to the image.
     * @param {string} storageName - The name of the storage.
     * @param {Record<string, string>} queryParams - A record of query parameters for image operations.
     */
    async processImage(
        imagePath: string,
        storageName: string,
        queryParams: Record<string, string>
    ): Promise<void> {
        // Extract file extension and base name from the path
        const ext = imagePath.split(".").pop() || "";
        const name = imagePath.split("/").pop()?.split(".")[0] || "";

        // if extension is empty
        if (!ext) {
            throw new ErrorObject(400, "File extension is missing");
        }

        // get final extension (which also validates original extension if not provided)
        const extension = validateImageExtension(queryParams.format || ext);

        // validate all queryParams
        const validatedParams = validateQueryParams(queryParams);

        // unique name
        const uniqueName = createNameFromParams(name, extension, queryParams);

        console.log(uniqueName);

        // TODO: Get inputBuffer from storage based on params.storageName and params.imagePath
        const inputBuffer: Buffer = Buffer.from(""); // Placeholder for actual image buffer

        // TODO: Save processedImageBuffer to storage
    }
}

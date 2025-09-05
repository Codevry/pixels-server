import SharpManager from "@/services/sharp.ts";
import { ErrorObject } from "@/utils/errorObject.ts";
import {
    createNameFromParams,
    validateImageExtension,
} from "@/utils/functions.ts";
import type { FormatEnum } from "sharp";

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
        operations: Record<string, string>,
        extension: keyof FormatEnum
    ): Promise<Buffer> {
        let sharpManager = new SharpManager(inputBuffer);

        // for resize handling
        if (operations.width || operations.height) {
            const w = operations.width ? Number(operations.width) : undefined;
            const h = operations.height ? Number(operations.height) : undefined;

            sharpManager.resize(w, h);
        }

        // handle various operations
        for (const [methodName, arg] of Object.entries(operations)) {
            try {
                switch (methodName) {
                    case "rotate":
                        sharpManager = sharpManager.rotate(Number(arg));
                        break;
                    case "grayscale":
                        sharpManager = sharpManager.grayscale();
                        break;
                    case "blur":
                        sharpManager = sharpManager.blur(Number(arg));
                        break;
                    case "flip":
                        sharpManager = sharpManager.flip();
                        break;
                    case "flop":
                        sharpManager = sharpManager.flop();
                        break;
                    case "tint":
                        sharpManager = sharpManager.tint(arg);
                        break;
                    default:
                        throw new ErrorObject(
                            401,
                            `Unsupported operation: ${methodName}`
                        );
                }
            } catch (error: any) {
                if (error instanceof ErrorObject) {
                    throw error;
                }
                throw new ErrorObject(
                    400,
                    `Failed to apply operation '${methodName}': ${error.message}`
                );
            }
        }

        // Apply the format conversion at the end
        if (operations.format || operations.quality) {
            const ext = validateImageExtension(operations.format || extension);
            sharpManager.toFormat(
                ext,
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

        // validate image extension
        const extension = validateImageExtension(ext);

        // unique name
        const uniqueName = createNameFromParams(name, ext, queryParams);

        // TODO: Get inputBuffer from storage based on params.storageName and params.imagePath
        const inputBuffer: Buffer = Buffer.from(""); // Placeholder for actual image buffer

        // TODO: Save processedImageBuffer to storage
    }
}

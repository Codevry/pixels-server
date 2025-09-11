/**
 * @file Controller for handling image processing and retrieval operations.
 * This includes converting images, processing them for storage, and retrieving them with transformations.
 */

import SharpManager from "@/services/sharp.ts";
import { ErrorObject } from "@/utils/errorObject.ts";
import {
    createNameFromParams,
    validateImageExtension,
    validateQueryParams,
} from "@/utils/functions.ts";
import type { FormatEnum } from "sharp";
import type {
    TypeImageConversionParams,
    TypeImageResponse,
} from "@/types/typeImage.ts";
import Globals from "@/utils/globals.ts";
import Silent from "@/utils/silent.ts";

/**
 * Controller class responsible for image manipulation and management.
 * It provides methods to convert, process, and retrieve images with various transformations.
 */
export default class CtrlImage {
    /**
     * Dynamically applies image transformations based on a record of operations.
     * Initializes a SharpManager with the input buffer and applies a series of transformations
     * such as resizing, rotation, grayscale, blur, flip, flop, and tint.
     * Finally, converts the image to the specified format and quality.
     * @param {Buffer} inputBuffer - The input image as a Buffer.
     * @param {Partial<TypeImageConversionParams>} operations - A partial object where keys are SharpManager method names and values are arguments for those methods.
     * @param {keyof FormatEnum} extension - The image extension (new or original) (e.g., 'jpeg', 'png').
     * @returns {Promise<Buffer>} The processed image as a Buffer.
     * @throws {ErrorObject} If any operation fails or is unsupported, or if the input buffer is invalid.
     */
    async convertImage(
        inputBuffer: Buffer,
        operations: Partial<TypeImageConversionParams>,
        extension: keyof FormatEnum
    ): Promise<Buffer> {
        // Initialize SharpManager with the input image buffer for processing
        let sharpManager = new SharpManager(inputBuffer);

        // Handle image resizing if width or height parameters are provided
        if (operations.width || operations.height) {
            sharpManager.resize(operations.width, operations.height);
        }

        // Process each image operation (rotate, greyscale, blur, etc.) sequentially
        for (const [methodName, arg] of Object.entries(operations)) {
            try {
                switch (methodName) {
                    case "rotate":
                        sharpManager = sharpManager.rotate(arg as number);
                        break;
                    case "greyscale":
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

        // Convert the image to the specified format and quality if requested
        if (operations.format || operations.quality) {
            sharpManager.toFormat(
                extension,
                operations.quality ? Number(operations.quality) : undefined
            );
        }

        // Convert the processed image to a buffer and return it
        return await sharpManager.toBuffer();
    }

    /**
     * Processes an image by converting it according to specified operations and storing the result.
     * Reads the original image from storage, applies the transformations using `convertImage`,
     * and then uploads the converted image back to storage with a new name.
     * @param {string} storage - The storage identifier where the image is located (e.g., 's3_main').
     * @param {string} originalPath - The full path to the original image in storage.
     * @param {string} originalName - The original file name of the image (e.g., 'image.jpg').
     * @param {string} parsedName - The new name for the processed image, including its new extension (e.g., 'image-h-100-w-200.png').
     * @param {Partial<TypeImageConversionParams>} operations - Image processing operations to be applied.
     * @param {keyof FormatEnum} newExtension - The target file extension for the processed image or existing if not exists
     * @returns {Promise<TypeImageResponse>} Object containing the processed image buffer and its extension.
     * @throws {ErrorObject} If the image cannot be read from storage, or if conversion/upload fails.
     */
    async processImage(
        storage: string,
        originalPath: string,
        originalName: string,
        parsedName: string,
        operations: Partial<TypeImageConversionParams>,
        newExtension: keyof FormatEnum
    ): Promise<TypeImageResponse> {
        // this will automatically returns error if image not exists
        const image = await Globals.storage[storage]?.readFile(
            originalPath,
            false
        );

        // convert it
        const converted = await this.convertImage(
            image!,
            operations,
            newExtension
        );

        // save it in storage
        Silent(
            "saveImageConverted",
            Globals.storage[storage]?.uploadFile(
                originalPath.replace(originalName, parsedName),
                converted
            )
        );

        // return converted image
        return {
            image: converted,
            extension: newExtension,
        };
    }

    /**
     * Retrieves an image, applying transformations based on query parameters if necessary.
     * Checks if the requested transformed image already exists in storage. If not, it reads the original image,
     * processes it with the specified transformations, and then stores the new version.
     * @param {string} imagePath - The path to the image (e.g., 'path/to/image.jpg').
     * @param {string} storageName - The name of the storage configuration to use (e.g., 's3_main').
     * @param {Record<string, string>} queryParams - A record of query parameters representing image operations (e.g., { w: '100', h: '100', format: 'png' }).
     * @returns {Promise<TypeImageResponse>} Object containing the processed image buffer and its extension.
     * @throws {ErrorObject} If the file extension is missing, no query parameters are provided for conversion,
     * or if any underlying storage/processing operation fails.
     */
    async getImage(
        imagePath: string,
        storageName: string,
        queryParams: Record<string, string>
    ): Promise<TypeImageResponse> {
        // check if extension is present
        if (!imagePath.includes("."))
            throw new ErrorObject(400, "File extension is missing");

        // Extract file extension and base name from the path
        const ext = imagePath.split(".").pop() || "";
        const name = imagePath.split("/").pop()?.split(".")[0] || "";
        const originalName = `${name}.${ext}`;

        // validate all queryParams
        const validatedParams = validateQueryParams(queryParams);

        // check if query params are required
        if (Object.keys(validatedParams).length === 0)
            throw new ErrorObject(400, "Query params required for conversion");

        // get final extension (which also validates original extension if not provided)
        const newExtension = validateImageExtension(queryParams.format);
        const originalExtension = validateImageExtension(ext)!;

        // get new / unique name (for conversion - will remain same if no params)
        const parsedName = createNameFromParams(
            name,
            newExtension || originalExtension,
            queryParams
        );

        // if available then readFile & return
        return new Promise((resolve, reject) => {
            // get image from storage (with params)
            Globals.storage[storageName]!.readFile(parsedName)
                .then((image) =>
                    resolve({
                        image,
                        extension: newExtension || originalExtension,
                    })
                )
                .catch((err) => {
                    // if file not found then remove from cache & convert it
                    if (err instanceof ErrorObject && err.status === 404)
                        // fetch original image & process it
                        resolve(
                            this.processImage(
                                storageName,
                                imagePath,
                                originalName,
                                parsedName,
                                validatedParams,
                                newExtension || originalExtension
                            )
                        );
                    // any other issue
                    else reject(err);
                });
        });
    }
}

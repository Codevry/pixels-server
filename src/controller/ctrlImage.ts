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
     * Processes an image by converting it according to specified operations and storing the result.
     * @param {string} storage - The storage identifier where the image is located.
     * @param {string} originalPath - The original image path
     * @param originalName
     * @param {string} parsedName - The new name for the processed image.
     * @param {Partial<TypeImageConversionParams>} operations - Image processing operations to be applied.
     * @param {keyof FormatEnum} newExtension - The target file extension.
     * @returns {Promise<TypeImageResponse>} Object containing the processed image buffer and its extension.
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
     * Processes an image based on its path, storage name, and query parameters.
     * @param {string} imagePath - The path to the image.
     * @param {string} storageName - The name of the storage.
     * @param {Record<string, string>} queryParams - A record of query parameters for image operations.
     */
    async getImage(
        imagePath: string,
        storageName: string,
        queryParams: Record<string, string>
    ): Promise<TypeImageResponse> {
        // Extract file extension and base name from the path
        const ext = imagePath.split(".").pop() || "";
        const name = imagePath.split("/").pop()?.split(".")[0] || "";
        const originalName = `${name}.${ext}`;

        // if extension is empty
        if (!ext) throw new ErrorObject(400, "File extension is missing");

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

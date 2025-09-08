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
     *
     */
    async processImage(
        storage: string,
        originalName: string,
        parsedName: string,
        operations: Partial<TypeImageConversionParams>,
        originalExtension: keyof FormatEnum,
        newExtension: keyof FormatEnum
    ): Promise<TypeImageResponse> {
        // this will automatically returns error if image not exists
        const image = await Globals.storage[storage]?.readFile(
            `${originalName}.${originalExtension}`
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
            Globals.storage[storage]?.uploadFile(parsedName, converted)
        );

        // save it in cache
        Silent("saveImageCache", Globals.ctrlRedis.saveImageRef(parsedName));

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

        // if extension is empty
        if (!ext) {
            throw new ErrorObject(400, "File extension is missing");
        }

        // get final extension (which also validates original extension if not provided)
        const extension = validateImageExtension(queryParams.format || ext);
        const originalExtension = validateImageExtension(ext);

        // validate all queryParams
        const validatedParams = validateQueryParams(queryParams);

        // get unique name
        const uniqueName = createNameFromParams(name, extension, queryParams);

        // find image in cache/storage
        const isConverted = await Globals.ctrlRedis.findImageRef(uniqueName);

        // if available then readFile & return
        if (isConverted) {
            return new Promise((resolve, reject) => {
                // get image from storage (with params)
                Globals.storage[storageName]!.readFile(uniqueName)
                    .then((image) =>
                        resolve({
                            image,
                            extension,
                        })
                    )
                    .catch((err) => {
                        // if file not found then remove from cache & convert it
                        if (err instanceof ErrorObject && err.status === 404) {
                            // remove from cache
                            Silent(
                                "removeImageRef",
                                Globals.ctrlRedis.removeImageRef(uniqueName)
                            );

                            // check if no operations are present
                            // i.e. we tried fetching original image
                            if (Object.keys(validatedParams).length === 0)
                                reject(err);
                            else
                                // fetch original image & process it
                                resolve(
                                    this.processImage(
                                        storageName,
                                        name,
                                        uniqueName,
                                        validatedParams,
                                        originalExtension,
                                        extension
                                    )
                                );
                        }
                        // any other issue
                        else reject(err);
                    });
            });
        } // fetch original image & process it
        else
            return this.processImage(
                storageName,
                name,
                uniqueName,
                validatedParams,
                originalExtension,
                extension
            );
    }
}

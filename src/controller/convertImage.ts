import SharpManager from "@/services/sharp.ts";
import { ErrorObject } from "@/utils/errorObject.ts";

/**
 * Dynamically applies image transformations based on a record of operations.
 * @param {Buffer} inputBuffer - The input image as a Buffer.
 * @param {Record<string, string>} operations - A record where keys are SharpManager method names and values are stringified arguments.
 * @returns {Promise<Buffer>} The processed image as a Buffer.
 * @throws {ErrorObject} If any operation fails or is unsupported.
 */
export default async function convertImage(
    inputBuffer: Buffer,
    operations: Record<string, string>
): Promise<Buffer> {
    let sharpInstance = new SharpManager(inputBuffer);

    // Extract width and height for resize before processing other operations
    let resizeWidth: number | undefined;
    let resizeHeight: number | undefined;
    const filteredOperations: Record<string, string> = {};

    for (const [key, value] of Object.entries(operations)) {
        if (key === "width") {
            resizeWidth = parseInt(value);
        } else if (key === "height") {
            resizeHeight = parseInt(value);
        } else {
            filteredOperations[key] = value;
        }
    }

    // Apply resize if width or height are present
    if (resizeWidth !== undefined || resizeHeight !== undefined) {
        sharpInstance = sharpInstance.resize(resizeWidth, resizeHeight);
    }

    for (const [methodName, argsString] of Object.entries(filteredOperations)) {
        // Ensure the method exists on SharpManager and is a function
        if (
            typeof sharpInstance[methodName as keyof SharpManager] ===
            "function"
        ) {
            try {
                let parsedArgs: any[] = [];

                // Parse arguments based on method name
                if (argsString) {
                    if (methodName === "toFormat") {
                        parsedArgs = [argsString];
                    } else if (
                        methodName === "rotate" ||
                        methodName === "blur"
                    ) {
                        parsedArgs = [parseFloat(argsString)];
                    } else if (methodName === "tint") {
                        parsedArgs = [argsString]; // hex color string
                    } else if (methodName === "negate") {
                        parsedArgs = [argsString === "true"];
                    } else {
                        // For methods that might take a single string/number argument not covered above
                        // or if the argument is just a simple value
                        parsedArgs = [argsString];
                    }
                }

                // Dynamically call the method
                sharpInstance = (
                    sharpInstance[methodName as keyof SharpManager] as any
                )(...parsedArgs);
            } catch (e: any) {
                throw new ErrorObject(
                    400,
                    `Invalid arguments for ${methodName}: ${argsString}. Error: ${e.message || e}`
                );
            }
        } else {
            throw new ErrorObject(
                400,
                `Unsupported image operation: ${methodName}`
            );
        }
    }

    return await sharpInstance.toBuffer();
}

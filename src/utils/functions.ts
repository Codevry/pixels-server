import { ErrorObject } from "@/utils/errorObject.ts";
import { formatMap, imageConversionParams } from "@/utils/extras.ts";
import type { FormatEnum } from "sharp";
import type { TypeImageConversionParams } from "@/types/typeImage.ts"; // Added import

/**
 * Converts a hexadecimal color string to RGB color values.
 * @param {string} hex - The hexadecimal color string (e.g., '#FF0000' or 'FF0000').
 * @returns {{ r: number; g: number; b: number }} An object containing RGB values (0-255).
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const cleanHex = hex.replace("#", "");
    return {
        r: parseInt(cleanHex.slice(0, 2), 16),
        g: parseInt(cleanHex.slice(2, 4), 16),
        b: parseInt(cleanHex.slice(4, 6), 16),
    };
}

/**
 * Creates a unique filename by combining image name, extension, and query parameters.
 * Sorts query parameters alphabetically to ensure consistent naming.
 * Excludes 'format' parameter as it's handled separately in image processing.
 * @param {string} imageName - The base name of the image without extension.
 * @param {keyof FormatEnum} imageExtension - The file extension of the image.
 * @param {Record<string, string>} queryParams - Query parameters for image transformations.
 * @returns {string} A unique string combining the image name, sorted query parameters, and extension.
 * @private
 */
export function createNameFromParams(
    imageName: string,
    imageExtension: keyof FormatEnum,
    queryParams: Record<string, string>
): string {
    const params: string[] = [];

    // handling each params and assign to paramString
    for (const [key, value] of Object.entries(queryParams)) {
        if (key !== "format" && imageConversionParams[key]) {
            const keyName = imageConversionParams[key];
            params.push(`${keyName}-${value}`);
        }
    }

    // convert to string
    const mappedParams = params.length > 0 ? params.sort().join("-") : null;

    return mappedParams
        ? `${imageName}-${mappedParams}.${imageExtension}`
        : `${imageName}.${imageExtension}`;
}

/**
 * Validates an image extension against supported formats and returns the sharp-compatible format.
 * @param {string} extension - The input image extension (e.g., 'jpg', 'png').
 * @returns {keyof FormatEnum} The sharp-compatible format string.
 * @throws {ErrorObject} If the extension is not supported.
 */
export function validateImageExtension(extension: string): keyof FormatEnum {
    const lowerCaseExtension = extension.toLowerCase();
    const outputFormat = formatMap[lowerCaseExtension];

    if (outputFormat) {
        return outputFormat;
    } else {
        throw new ErrorObject(400, `Unsupported image extension: ${extension}`);
    }
}

/**
 * Validates and processes query parameters for image manipulation.
 * Converts string values to appropriate types (number, boolean) and validates their ranges.
 * Handles special cases like format validation and hex color conversion.
 * @param {Record<string, string>} queryParams - Raw query parameters from the request
 * @returns {Partial<TypeImageConversionParams>} Validated and converted parameters
 * @throws {ErrorObject} If any parameter is invalid or out of allowed range
 */
export function validateQueryParams(
    queryParams: Record<string, string>
): Partial<TypeImageConversionParams> {
    // Initialize output object and get list of supported parameters
    const validatedParams: Partial<TypeImageConversionParams> = {};
    const validKeys = Object.keys(imageConversionParams);

    // Validate each parameter and convert to appropriate type
    for (const [key, value] of Object.entries(queryParams)) {
        if (!validKeys.includes(key)) {
            throw new ErrorObject(400, `Unsupported query parameter: ${key}`);
        }

        switch (key) {
            // Handle numeric parameters: validate number conversion and ranges
            case "width":
            case "height":
            case "quality":
            case "blur":
            case "rotate":
                const numValue = Number(value);
                if (isNaN(numValue)) {
                    throw new ErrorObject(
                        400,
                        `Invalid number for ${key}: ${value}`
                    );
                }
                if (key === "quality" && (numValue < 0 || numValue > 100)) {
                    throw new ErrorObject(
                        400,
                        `Quality must be between 0 and 100: ${value}`
                    );
                }
                if (
                    (key === "width" ||
                        key === "height" ||
                        key === "blur" ||
                        key === "rotate") &&
                    numValue < 0
                ) {
                    throw new ErrorObject(
                        400,
                        `${key} must be a non-negative number: ${value}`
                    );
                }
                validatedParams[key] = numValue;
                break;

            // Handle boolean parameters: convert string values to boolean
            case "greyscale":
            case "flip":
            case "flop":
                const boolValue = value.toLowerCase();
                if (boolValue === "true" || boolValue === "1") {
                    (validatedParams as any)[key] = true;
                } else if (boolValue === "false" || boolValue === "0") {
                    (validatedParams as any)[key] = false;
                } else {
                    throw new ErrorObject(
                        400,
                        `Invalid boolean for ${key}: ${value}`
                    );
                }
                break;

            // Handle special case parameters: format validation and hex color conversion
            case "format":
                validatedParams.format = validateImageExtension(value);
                break;

            case "tint":
                try {
                    hexToRgb(value);
                    validatedParams.tint = value;
                } catch (e) {
                    throw new ErrorObject(
                        400,
                        `Invalid hex color for tint: ${value}`
                    );
                }
                break;

            default:
                throw new ErrorObject(
                    400,
                    `Unhandled query parameter type for: ${key}`
                );
        }
    }

    return validatedParams;
}

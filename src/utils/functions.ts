import { ErrorObject } from "@/utils/errorObject.ts";
import { formatMap, imageConversionParams } from "@/utils/extras.ts";
import type { FormatEnum } from "sharp";

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
 * @param {string} imageExtension - The file extension of the image.
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

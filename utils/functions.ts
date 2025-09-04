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
import sharp, { type FormatEnum } from "sharp";
import { ErrorObject } from "@/utils/errorObject.ts";
import { hexToRgb } from "@/utils/functions.ts";

/**
 * SharpManager class provides a convenient way to perform image processing operations
 * using the 'sharp' library. All methods are chainable, and input/output are handled
 * as Buffers.
 */
export default class SharpManager {
    private image: sharp.Sharp;

    /**
     * Creates an instance of SharpManager.
     * @param {Buffer} input - The input image as a Buffer.
     */
    constructor(input: Buffer) {
        this.image = sharp(input);
    }

    /**
     * Resizes the image.
     * @param {number} [width] - The desired width.
     * @param {number} [height] - The desired height.
     * @param {sharp.ResizeOptions} [options] - Resize options.
     * @returns {SharpManager} The current SharpManager instance for chaining.
     */
    public resize(
        width?: number,
        height?: number,
        options?: sharp.ResizeOptions
    ): SharpManager {
        this.image = this.image.resize(width, height, options);
        return this;
    }

    /**
     * Converts the image to a specified format.
     * @param {keyof sharp.Format} format - The desired output format (e.g., 'jpeg', 'png', 'webp').
     * @param {sharp.OutputOptions} [options] - Output options for the format.
     * @returns {SharpManager} The current SharpManager instance for chaining.
     */
    public toFormat(
        format: keyof FormatEnum,
        options?: sharp.OutputOptions
    ): SharpManager {
        this.image = this.image.toFormat(format, options);
        return this;
    }

    /**
     * Rotates the image.
     * @param {number} [angle] - The rotation angle in degrees (0, 90, 180, 270). Defaults to 0.
     * @returns {SharpManager} The current SharpManager instance for chaining.
     */
    public rotate(angle?: number): SharpManager {
        this.image = this.image.rotate(angle);
        return this;
    }

    /**
     * Converts the image to grayscale.
     * @returns {SharpManager} The current SharpManager instance for chaining.
     */
    public grayscale(): SharpManager {
        this.image = this.image.grayscale();
        return this;
    }

    /**
     * Applies a blur effect to the image.
     * @param {number} [sigma] - The sigma value for the blur. Defaults to 0.3.
     * @returns {SharpManager} The current SharpManager instance for chaining.
     */
    public blur(sigma?: number): SharpManager {
        this.image = this.image.blur(sigma);
        return this;
    }

    /**
     * Extracts a region of the image.
     * @param {sharp.Region} region - The region to extract.
     * @returns {SharpManager} The current SharpManager instance for chaining.
     */
    public extract(region: sharp.Region): SharpManager {
        this.image = this.image.extract(region);
        return this;
    }

    /**
     * Flips the image vertically.
     * @returns {SharpManager} The current SharpManager instance for chaining.
     */
    public flip(): SharpManager {
        this.image = this.image.flip();
        return this;
    }

    /**
     * Flops the image horizontally.
     * @returns {SharpManager} The current SharpManager instance for chaining.
     */
    public flop(): SharpManager {
        this.image = this.image.flop();
        return this;
    }

    /**
     * Negates the image.
     * @param {boolean} [value] - Whether to negate. Defaults to true.
     * @returns {SharpManager} The current SharpManager instance for chaining.
     */
    public negate(value?: boolean): SharpManager {
        this.image = this.image.negate(value);
        return this;
    }

    /**
     * Normalises the image.
     * @returns {SharpManager} The current SharpManager instance for chaining.
     */
    public normalise(): SharpManager {
        this.image = this.image.normalise();
        return this;
    }

    /**
     * Applies a color tint to the image.
     * @param {string} hexColor - Hex color string (e.g., '#FF0000').
     * @returns {SharpManager} The current SharpManager instance for chaining.
     */
    public tint(hexColor: string): SharpManager {
        const { r, g, b } = hexToRgb(hexColor);
        this.image = this.image.tint({ r, g, b });
        return this;
    }

    /**
     * Returns the processed image as a Buffer.
     * @returns {Promise<Buffer>} The output image as a Buffer.
     * @throws {ErrorObject} Will throw an error if sharp processing fails.
     */
    public async toBuffer(): Promise<Buffer> {
        try {
            return await this.image.toBuffer();
        } catch (error) {
            throw new ErrorObject(502, `Sharp processing failed: ${error}`);
        }
    }
}

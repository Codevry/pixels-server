import type { FormatEnum } from "sharp";

// useful for creating image name
export const imageConversionParams: Record<string, string> = {
    height: "h",
    width: "w",
    quality: "q",
    format: "f",
    blur: "b",
    greyscale: "g",
    rotate: "r",
    flip: "flip",
    flop: "flop",
    tint: "t",
    negate: "n",
};

// useful for extension of image
export const formatMap: Record<string, keyof FormatEnum> = {
    jpg: "jpg",
    jpeg: "jpeg",
    png: "png",
    webp: "webp",
    gif: "gif",
    tiff: "tiff",
    avif: "avif",
    heif: "heif",
    jp2: "jp2",
    jxl: "jxl",
    raw: "raw",
};

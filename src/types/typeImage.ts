export type TypeImageConversionParams = {
    width: number;
    height: number;
    quality: number;
    format: string;
    blur: number;
    greyscale: boolean;
    rotate: number;
    flip: boolean;
    flop: boolean;
    tint: string;
};

export type TypeImageResponse = {
    image: Buffer;
    extension: string;
};

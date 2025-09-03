import type { ENUM_STORAGE_TYPE } from "@/utils/enums.ts";

// storage handling
export type TypeStorage = Record<string, TypeStorageConfig>;

// storage config
export type TypeStorageConfig = {
    type: ENUM_STORAGE_TYPE;
    s3?: TypeStorageS3Config;
    ftp?: TypeFtpConfig;
    local?: string;
};

// s3 storage
export type TypeStorageS3Config = {
    bucket: string;
    endpoint: string;
    accessKey: string;
    secretKey: string;
    prefix: string;
    region: string;
};

// ftp storage
export type TypeFtpConfig = {
    host: string;
    port?: number;
    user: string;
    password?: string;
    privateKey?: string;
    passphrase?: string;
    remoteDir?: string;
};

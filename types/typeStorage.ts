import type { ENUM_STORAGE_TYPE } from "@/utils/enums.ts";
import { S3Manager, type TypeS3Manager } from "@/services/s3.ts";
import FtpManager, { type TypeFtpManager } from "@/services/ftp.ts";

// storage managers
export type TypeStorageManager = Record<string, S3Manager | FtpManager>;

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

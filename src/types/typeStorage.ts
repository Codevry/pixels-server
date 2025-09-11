import type { ENUM_STORAGE_TYPE } from "@/utils/enums.ts";
import type { StorageManager } from "@/storage/storageManager.ts";
// storage managers
export type TypeStorageManager = Record<string, StorageManager>;

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
    convertPath?: string;
    acl: TypeS3Acl;
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
    cachePath?: string;
};

// s3 acl
export type TypeS3Acl =
    | "private"
    | "public-read"
    | "public-read-write"
    | "aws-exec-read"
    | "authenticated-read"
    | "bucket-owner-read"
    | "bucket-owner-full-control"
    | "log-delivery-write";

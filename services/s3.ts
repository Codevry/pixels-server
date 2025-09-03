import { S3Client } from "@aws-sdk/client-s3";
import type { TypeStorageS3Config } from "@/types/typeStorage.ts";

export type TypeS3Manager = Record<string, S3Manager>;

export class S3Manager {
    private readonly client: S3Client;
    private config: TypeStorageS3Config;

    /**
     * Creates an instance of S3Manager
     * @param {TypeStorageS3Config} config - The configuration object for S3
     */
    constructor(config: TypeStorageS3Config) {
        this.config = config;
        this.client = new S3Client({
            ...config,
            credentials: {
                accessKeyId: config.accessKey,
                secretAccessKey: config.secretKey,
            },
            forcePathStyle: true,
        });
    }
}

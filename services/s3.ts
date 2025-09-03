import { S3Client } from "@aws-sdk/client-s3";

export type S3Config = {
    bucket: string;
    endpoint: string;
    accessKey: string;
    secretKey: string;
    prefix: string;
    region: string;
};

export class S3Manager {
    private readonly client: S3Client;
    private config: S3Config;

    /**
     * Creates an instance of S3Manager
     * @param {S3Config} config - The configuration object for S3
     */
    constructor(config: S3Config) {
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

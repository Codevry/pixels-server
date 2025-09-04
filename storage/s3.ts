import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    NotFound,
} from "@aws-sdk/client-s3";
import type { TypeStorageS3Config } from "@/types/typeStorage.ts";
import { ErrorObject } from "@/utils/errorObject.ts";

export default class S3Manager {
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

    /**
     * Uploads a file to S3.=
     * @param {string} key - The key (path) of the file in the bucket.
     * @param {Buffer} body - The content of the file to upload as a Buffer.
     * @returns {Promise<any>} - The result of the upload operation.
     */
    public async uploadFile(key: string, body: Buffer): Promise<any> {
        try {
            const command = new PutObjectCommand({
                Bucket: this.config.bucket,
                Key: key,
                Body: body,
            });
            return await this.client.send(command);
        } catch (error) {
            throw new ErrorObject(502, error);
        }
    }

    /**
     * Reads a file from S3.
     * @param {string} key - The key (path) of the file in the bucket.
     * @returns {Promise<Buffer>} - The content of the file as a Buffer.
     * @throws {ErrorObject} - Throws an ErrorObject if the file is not found or another error occurs.
     */
    public async readFile(key: string): Promise<Buffer> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.config.bucket,
                Key: key,
            });
            const response = await this.client.send(command);
            if (response.Body) {
                return Buffer.from(await response.Body.transformToByteArray());
            } else {
                throw new ErrorObject(
                    404,
                    "File content is empty or not found."
                );
            }
        } catch (error) {
            if (error instanceof NotFound) {
                throw new ErrorObject(404, "File not found.");
            }
            throw new ErrorObject(502, error);
        }
    }

    /**
     * Deletes a file from S3.
     * @param {string} key - The key (path) of the file in the bucket.
     * @returns {Promise<any>} - The result of the delete operation.
     */
    public async deleteFile(key: string): Promise<any> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.config.bucket,
                Key: key,
            });
            return await this.client.send(command);
        } catch (error) {
            throw new ErrorObject(502, error);
        }
    }
}

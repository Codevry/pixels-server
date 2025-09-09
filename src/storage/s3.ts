import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    NotFound,
    type PutObjectCommandOutput,
    type DeleteObjectCommandOutput,
    type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import type { TypeStorageS3Config } from "@/types/typeStorage.ts";
import { ErrorObject } from "@/utils/errorObject.ts";

export default class S3Manager {
    private readonly client: S3Client;
    private config: TypeStorageS3Config;

    /**
     * Creates an instance of S3Manager for handling S3 storage operations
     * @param {TypeStorageS3Config} config - Configuration object containing S3 credentials and settings
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
     * Uploads a file to S3 storage
     * @param {string} key - The key (path) of the file in the bucket
     * @param {Buffer} body - The content of the file to upload as a Buffer
     * @returns {Promise<PutObjectCommandOutput>} Result of the upload operation
     * @throws {ErrorObject} Throws when upload fails
     */
    public async uploadFile(
        key: string,
        body: Buffer
    ): Promise<PutObjectCommandOutput> {
        try {
            const prefix = this.config.convertPath || this.config.prefix;
            const command = new PutObjectCommand({
                Bucket: this.config.bucket,
                Key: prefix + key,
                Body: body,
            });
            return await this.client.send(command);
        } catch (error) {
            throw new ErrorObject(502, error);
        }
    }

    /**
     * Reads a file from S3 storage
     * @param {string} key - The key (path) of the file in the bucket
     * @param {boolean} fromConvertPath - Read the file for convertPath or original
     * @returns {Promise<Buffer>} The content of the file as a Buffer
     * @throws {ErrorObject} Throws when the file is not found or read operation fails
     */
    public async readFile(
        key: string,
        fromConvertPath: boolean = true
    ): Promise<Buffer> {
        try {
            // Choose between convertPath (if specified and requested) or default prefix
            // This allows flexibility in storing files in different paths based on their purpose
            const prefix =
                fromConvertPath && this.config.convertPath
                    ? this.config.convertPath
                    : this.config.prefix;

            const command = new GetObjectCommand({
                Bucket: this.config.bucket,
                Key: prefix + key,
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
            if (
                error instanceof NotFound ||
                (error instanceof Error && error.name === "NoSuchKey")
            ) {
                throw new ErrorObject(404, "Image not exists in storage");
            }
            throw new ErrorObject(502, error);
        }
    }

    /**
     * Lists all files within a specified directory (prefix) in the S3 bucket.
     * Handles pagination to retrieve all objects.
     * @param {string} directoryPath - The directory (prefix) to list files from.
     * @returns {Promise<string[]>} An array of file keys (paths).
     * @throws {ErrorObject} Throws when the list operation fails.
     */
    public async listFiles(directoryPath: string): Promise<string[]> {
        try {
            const files: string[] = [];
            let continuationToken: string | undefined;

            do {
                const command = new ListObjectsV2Command({
                    Bucket: this.config.bucket,
                    Prefix: directoryPath,
                    ContinuationToken: continuationToken,
                });
                const response: ListObjectsV2CommandOutput = await this.client.send(command);

                if (response.Contents) {
                    for (const content of response.Contents) {
                        if (content.Key) {
                            files.push(content.Key);
                        }
                    }
                }
                continuationToken = response.NextContinuationToken;
            } while (continuationToken);

            return files;
        } catch (error) {
            throw new ErrorObject(502, error);
        }
    }

    /**
     * Deletes a file from S3 storage
     * @param {string} key - The key (path) of the file in the bucket
     * @param {boolean} toCache - Flag indicating whether to delete from cache path
     * @returns {Promise<DeleteObjectCommandOutput>} Result of the delete operation
     * @throws {ErrorObject} Throws when delete operation fails
     */
    /*public async deleteFile(
        key: string,
        toCache: boolean
    ): Promise<DeleteObjectCommandOutput> {
        try {
            const prefix = toCache ? this.config.cachePath : this.config.prefix;

            const command = new DeleteObjectCommand({
                Bucket: this.config.bucket,
                Key: prefix + key,
            });
            return await this.client.send(command);
        } catch (error) {
            throw new ErrorObject(502, error);
        }
    }*/

    /**
     * Checks if a file exists in S3 storage
     * @param {string} key - The key (path) of the file in the bucket
     * @param {boolean} toCache - Flag indicating whether to check in cache path
     * @returns {Promise<boolean>} True if the file exists, false otherwise
     * @throws {ErrorObject} Throws when check operation fails with error other than NotFound
     */
    /*public async exists(key: string, toCache: boolean): Promise<boolean> {
        try {
            const prefix =
                toCache && this.config.cachePath
                    ? this.config.cachePath
                    : this.config.prefix;

            const command = new HeadObjectCommand({
                Bucket: this.config.bucket,
                Key: prefix + key,
            });
            await this.client.send(command);
            return true;
        } catch (error) {
            if (error instanceof NotFound) {
                return false;
            }
            // Re-throw other errors
            throw new ErrorObject(502, error);
        }
    }*/
}

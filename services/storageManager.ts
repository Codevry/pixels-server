import S3Manager from "./s3.ts";
import FtpClientManager from "./ftp_client.ts";
import SftpClientManager from "./sftp_client.ts";
import { ENUM_STORAGE_TYPE } from "@/utils/enums.ts";
import type { TypeStorageConfig } from "@/types/typeStorage.ts";
import { ErrorObject } from "@/utils/errorObject.ts";

type AnyStorageManager = S3Manager | FtpClientManager | SftpClientManager;

/**
 * StorageManager class that provides a unified interface for different storage types (S3, FTP, SFTP).
 * Acts as a facade for specific storage implementations and handles file operations.
 */

export class StorageManager {
    private activeManager: AnyStorageManager;
    public readonly type: ENUM_STORAGE_TYPE;
    private readonly cacheLocation?: string;

    /**
     * Creates an instance of StorageManager.
     * @param {TypeStorageConfig} config - Configuration object containing storage type and specific storage settings
     * @throws {ErrorObject} Will throw an error if a storage type is unsupported or not implemented
     */
    constructor(config: TypeStorageConfig) {
        this.type = config.type;
        switch (config.type) {
            case ENUM_STORAGE_TYPE.s3:
                this.activeManager = new S3Manager(config.s3!);
                this.cacheLocation = config.s3?.cachePath;
                break;
            case ENUM_STORAGE_TYPE.ftp:
                this.activeManager = new FtpClientManager(config.ftp!);
                this.cacheLocation = config.ftp?.cachePath;
                break;
            case ENUM_STORAGE_TYPE.sftp:
                this.activeManager = new SftpClientManager(config.ftp!);
                this.cacheLocation = config.ftp?.cachePath;
                break;
            case ENUM_STORAGE_TYPE.local:
                throw new ErrorObject(
                    500,
                    "Local storage not yet implemented."
                );
            default:
                throw new ErrorObject(
                    500,
                    `Unsupported storage type: ${config.type}`
                );
        }
    }

    /**
     * Establishes a connection to the underlying storage manager if required (e.g., for FTP/SFTP).
     * S3 and Local storage do not require an explicit 'connect' method.
     * @returns {Promise<void>}
     */
    public async connect(): Promise<void> {
        if (
            this.type === ENUM_STORAGE_TYPE.ftp ||
            this.type === ENUM_STORAGE_TYPE.sftp
        ) {
            await (
                this.activeManager as FtpClientManager | SftpClientManager
            ).connect();
        }
        // S3 and Local storage do not require an explicit 'connect' method
    }

    /**
     * Uploads a file to the configured storage.
     * For FTP/SFTP, creates a temporary file before upload and removes it afterward.
     * @param {string} key - The key (path) where the file should be stored
     * @param {Buffer} body - The content of the file to upload
     * @returns {Promise<any>} Result of the upload operation
     * @throws {ErrorObject} Will throw an error if upload is not supported for the storage type
     */
    public async uploadFile(key: string, body: Buffer): Promise<any> {
        if (this.type === ENUM_STORAGE_TYPE.s3) {
            return (this.activeManager as S3Manager).uploadFile(key, body);
        } else if (
            this.type === ENUM_STORAGE_TYPE.ftp ||
            this.type === ENUM_STORAGE_TYPE.sftp
        ) {
            const tempFilePath = `/tmp/${Date.now()}-${Math.random().toString(36).substring(2)}.tmp`;
            await Bun.write(tempFilePath, body);
            try {
                return await (
                    this.activeManager as FtpClientManager | SftpClientManager
                ).uploadFile(tempFilePath, key);
            } finally {
                await Bun.file(tempFilePath).delete();
            }
        }
        throw new ErrorObject(
            500,
            "Upload not supported for this storage type."
        );
    }

    /**
     * Reads a file from the configured storage.
     * @param {string} key - The key (path) of the file to read
     * @returns {Promise<Buffer>} The content of the file as a Buffer
     */
    public async readFile(key: string): Promise<Buffer> {
        return this.activeManager.readFile(key);
    }

    /**
     * Deletes a file from the configured storage.
     * @param {string} key - The key (path) of the file to delete
     * @returns {Promise<any>} Result of the delete operation
     */
    public async deleteFile(key: string): Promise<any> {
        return this.activeManager.deleteFile(key);
    }
}

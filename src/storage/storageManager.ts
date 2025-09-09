import S3Manager from "./s3.ts";
import FtpClientManager from "./ftp_client.ts";
import SftpClientManager from "./sftp_client.ts";
import { ENUM_STORAGE_TYPE } from "@/utils/enums.ts";
import type { TypeStorageConfig } from "@/types/typeStorage.ts";
import { ErrorObject } from "@/utils/errorObject.ts";

type AnyStorageManager = S3Manager | FtpClientManager | SftpClientManager;

/**
 * Interface defining the contract for storage management operations.
 * Implementations should handle various storage types (S3, FTP, SFTP, etc.).
 */
interface StorageManagerInterface {
    /**
     * Uploads a file to the storage.
     * @param {string} key - The key (path) where the file should be stored
     * @param {Buffer} body - The content of the file to upload
     * @returns {Promise<any>} Result of the upload operation
     */
    uploadFile(key: string, body: Buffer): Promise<any>;

    /**
     * Reads a file from the storage.
     * @param {string} key - The key (path) of the file to read
     * @param {boolean} [fromConvertPath] - Whether to read from the convert path
     * @returns {Promise<Buffer>} The content of the file as a Buffer
     */
    readFile(key: string, fromConvertPath?: boolean): Promise<Buffer>;

    /**
     * Lists all files in a specified directory.
     * @param {string} directoryPath - The directory path to list files from
     * @returns {Promise<string[]>} Array of file keys (paths)
     */
    listFiles(directoryPath: string): Promise<string[]>;
}

/**
 * StorageManager class that provides a unified interface for different storage types (S3, FTP, SFTP).
 * Acts as a facade for specific storage implementations and handles file operations such as upload,
 * download, deletion and existence checks. Also handles caching operations when specified.
 */
export class StorageManager implements StorageManagerInterface {
    private activeManager: AnyStorageManager;
    public readonly type: ENUM_STORAGE_TYPE;

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

                break;
            case ENUM_STORAGE_TYPE.ftp:
                this.activeManager = new FtpClientManager(config.ftp!);
                break;
            case ENUM_STORAGE_TYPE.sftp:
                this.activeManager = new SftpClientManager(config.ftp!);
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
     * @param {boolean} fromConvertPath - Whether to read in the convertPath
     * @returns {Promise<Buffer>} The content of the file as a Buffer
     */
    public async readFile(
        key: string,
        fromConvertPath: boolean = true
    ): Promise<Buffer> {
        return this.activeManager.readFile(key, fromConvertPath);
    }

    /**
     * Lists all files within a specified directory (prefix) in the configured storage.
     * Currently only implemented for S3.
     * @param {string} directoryPath - The directory (prefix) to list files from.
     * @returns {Promise<string[]>} An array of file keys (paths).
     * @throws {ErrorObject} Throws when the list operation is not supported for the storage type or fails.
     */
    public async listFiles(directoryPath: string): Promise<string[]> {
        if (this.type === ENUM_STORAGE_TYPE.s3) {
            return (this.activeManager as S3Manager).listFiles(directoryPath);
        }
        throw new ErrorObject(
            500,
            "List files operation not supported for this storage type."
        );
    }

    /**
     * Deletes a file from the configured storage.
     * @param {string} key - The key (path) of the file to delete
     * @param {boolean} fromCache - Whether to also remove from cache
     * @returns {Promise<any>} Result of the delete operation
     */
    /* public async deleteFile(key: string, fromCache: boolean): Promise<any> {
        return this.activeManager.deleteFile(key, fromCache);
    }*/

    /**
     * Checks if a file exists in the configured storage.
     * @param {string} key - The key (path) of the file to check
     * @param {boolean} inCache - Whether to check existence in cache
     * @returns {Promise<boolean>} True if the file exists, false otherwise
     */
    /*public async exists(key: string, inCache: boolean): Promise<boolean> {
        return this.activeManager.exists(key, inCache);
    }*/
}

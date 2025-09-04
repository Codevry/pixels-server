import type { TypeFtpConfig } from "@/types/typeStorage.ts";
import { ENUM_STORAGE_TYPE } from "@/utils/enums.ts";
import SftpClientManager from "./sftp_client.ts";
import FtpClientManager from "./ftp_client.ts";

/**
 * Manages FTP and SFTP connections and operations by dispatching to the appropriate client.
 * This class acts as a facade, providing a unified interface for both FTP and SFTP operations.
 */
export default class FtpManager {
    private client: SftpClientManager | FtpClientManager;

    /**
     * Initializes a new FtpManager instance.
     * @param config The FTP/SFTP configuration, including host, port, user, and authentication details.
     * @param protocol The storage type, either ENUM_STORAGE_TYPE.ftp or ENUM_STORAGE_TYPE.sftp.
     */
    constructor(config: TypeFtpConfig, protocol: ENUM_STORAGE_TYPE) {
        if (protocol === ENUM_STORAGE_TYPE.sftp) {
            this.client = new SftpClientManager(config);
        } else if (protocol === ENUM_STORAGE_TYPE.ftp) {
            this.client = new FtpClientManager(config);
        } else {
            throw new Error("Unsupported protocol for FtpManager: " + protocol);
        }
    }

    /**
     * Establishes a connection to the FTP or SFTP server.
     * Delegates the call to the underlying client (SftpManager or FtpClientManager).
     * Throws an error if the connection fails.
     */
    public async connect(): Promise<void> {
        await this.client.connect();
    }

    /**
     * Disconnects from the FTP or SFTP server.
     * Delegates the call to the underlying client (SftpManager or FtpClientManager).
     * Throws an error if the disconnection fails.
     */
    public async disconnect(): Promise<void> {
        await this.client.disconnect();
    }

    /**
     * Uploads a file from the local filesystem to the FTP or SFTP server.
     * Delegates the call to the underlying client (SftpManager or FtpClientManager).
     * @param localPath The absolute path to the local file to upload.
     * @param remotePath The absolute path on the server where the file should be stored.
     * Throws an error if the upload fails.
     */
    public async upload(localPath: string, remotePath: string): Promise<void> {
        await this.client.upload(localPath, remotePath);
    }

    /**
     * Reads a file from the FTP or SFTP server and returns its content as a Buffer.
     * Delegates the call to the underlying client (SftpManager or FtpClientManager).
     * @param remotePath The absolute path to the file on the server to read.
     * @returns A Buffer containing the file's content.
     * Throws an error if the file cannot be read or found.
     */
    public async readFileBuffer(remotePath: string): Promise<Buffer> {
        return this.client.readFileBuffer(remotePath);
    }

    // Additional FTP/SFTP operations can be added here and delegated to the client.
}

/**
 * Defines a type for a collection of FtpManager instances, keyed by a string identifier.
 * This allows for managing multiple distinct FTP/SFTP connections simultaneously.
 */
export type TypeFtpManager = Record<string, FtpManager>;

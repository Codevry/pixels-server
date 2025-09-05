import type { TypeFtpConfig } from "@/types/typeStorage.ts";
import SFTPClient from "ssh2-sftp-client";
import { ErrorObject } from "@/utils/errorObject.ts";

/**
 * Manages SFTP connections and operations using the ssh2-sftp-client library.
 * This class encapsulates the logic for connecting, disconnecting, and performing
 * file transfers (e.g., upload, read) to an SFTP router based on the provided configuration.
 */
export default class SftpClientManager {
    private config: TypeFtpConfig;
    private sftpClient: SFTPClient;

    /**
     * Initializes a new SftpManager instance.
     * @param config The SFTP configuration, including host, port, user, and authentication details.
     */
    constructor(config: TypeFtpConfig) {
        this.config = config;
        this.sftpClient = new SFTPClient();
    }

    /**
     * Establishes a connection to the SFTP router.
     * It uses the configuration provided during instantiation.
     * Throws an error if the connection fails.
     */
    public async connect(): Promise<void> {
        console.log(`Attempting to connect to SFTP host: ${this.config.host}`);
        try {
            await this.sftpClient.connect({
                host: this.config.host,
                port: this.config.port || 22,
                username: this.config.user,
                password: this.config.password,
                privateKey: this.config.privateKey,
                passphrase: this.config.passphrase,
            });
            console.log("Connected to SFTP.");
        } catch (error) {
            console.error("SFTP connection failed:", error);
            throw error;
        }
    }

    /**
     * Disconnects from the SFTP router.
     * Throws an error if the disconnection fails.
     */
    public async disconnect(): Promise<void> {
        console.log("Disconnecting from SFTP.");
        try {
            await this.sftpClient.end();
            console.log("Disconnected from SFTP.");
        } catch (error) {
            console.error("SFTP disconnection failed:", error);
            throw error;
        }
    }

    /**
     * Uploads a file from the local filesystem to the SFTP router.
     * @param localPath The absolute path to the local file to upload.
     * @param remotePath The absolute path on the SFTP router where the file should be stored.
     * Throws an error if the upload fails.
     */
    public async uploadFile(
        localPath: string,
        remotePath: string
    ): Promise<void> {
        console.log(`Uploading ${localPath} to ${remotePath} via SFTP`);
        try {
            await this.sftpClient.put(localPath, remotePath);
            console.log("Upload complete.");
        } catch (error) {
            console.error("SFTP upload failed:", error);
            throw error;
        }
    }

    /**
     * Reads a file from the SFTP router and returns its content as a Buffer.
     * This is useful for processing file content directly in memory.
     * @param remotePath The absolute path to the file on the SFTP router to read.
     * @returns A Buffer containing the file's content.
     * Throws an error if the file cannot be read or found.
     */
    public async readFile(remotePath: string): Promise<Buffer> {
        console.log(`Reading file buffer from ${remotePath} via SFTP`);
        try {
            const buffer = (await this.sftpClient.get(remotePath)) as Buffer;
            console.log("File buffer read.");
            return buffer;
        } catch (error: any) {
            console.error("SFTP read file buffer failed:", error);
            if (error.message.includes("No such file")) {
                throw new ErrorObject(404, `File not found: ${remotePath}`);
            }
            throw error;
        }
    }

    /**
     * Deletes a file from the SFTP router.
     * @param remotePath The absolute path to the file on the SFTP router to delete.
     * Throws an error if the deletion fails.
     */
    public async deleteFile(remotePath: string): Promise<void> {
        console.log(`Deleting file ${remotePath} via SFTP`);
        try {
            await this.sftpClient.delete(remotePath);
            console.log("File deleted successfully.");
        } catch (error) {
            console.error("SFTP delete file failed:", error);
            throw error;
        }
    }

    /**
     * Checks if a file exists on the SFTP router.
     * @param remotePath The absolute path to the file on the router to check.
     * @returns {Promise<boolean>} True if the file exists, false otherwise.
     */
    public async exists(remotePath: string): Promise<boolean> {
        console.log(`Checking if file ${remotePath} exists via SFTP`);
        try {
            const result = await this.sftpClient.exists(remotePath);
            return result !== false; // exists returns false if not found, or 'd' for directory, '-' for file etc.
        } catch (error) {
            console.error("SFTP exists check failed:", error);
            throw error;
        }
    }
}

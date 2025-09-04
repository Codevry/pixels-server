import type { TypeFtpConfig } from "@/types/typeStorage.ts";
import * as FTPClient from "basic-ftp";
import { Writable } from "stream";

/**
 * Manages FTP connections and operations using the basic-ftp library.
 * This class encapsulates the logic for connecting, disconnecting, and performing
 * file transfers (e.g., upload, read) to an FTP server based on the provided configuration.
 */
export default class FtpClientManager {
    private config: TypeFtpConfig;
    private ftpClient: FTPClient.Client;

    /**
     * Initializes a new FtpClientManager instance.
     * @param config The FTP configuration, including host, port, user, and authentication details.
     */
    constructor(config: TypeFtpConfig) {
        this.config = config;
        this.ftpClient = new FTPClient.Client();
        // basic-ftp debug mode
        // this.ftpClient.ftp.verbose = true;
    }

    /**
     * Establishes a connection to the FTP server.
     * It uses the configuration provided during instantiation.
     * Throws an error if the connection fails.
     */
    public async connect(): Promise<void> {
        console.log(`Attempting to connect to FTP host: ${this.config.host}`);
        try {
            await this.ftpClient.access({
                host: this.config.host,
                port: this.config.port || 21,
                user: this.config.user,
                password: this.config.password,
                secure: false, // Set to true for FTPS (FTP over SSL/TLS)
                // secureOptions: { rejectUnauthorized: false }, // For self-signed certificates
            });
            console.log("Connected to FTP.");
        } catch (error) {
            console.error("FTP connection failed:", error);
            throw error;
        }
    }

    /**
     * Disconnects from the FTP server.
     * Throws an error if the disconnection fails.
     */
    public async disconnect(): Promise<void> {
        console.log("Disconnecting from FTP.");
        try {
            this.ftpClient.close();
            console.log("Disconnected from FTP.");
        } catch (error) {
            console.error("FTP disconnection failed:", error);
            throw error;
        }
    }

    /**
     * Uploads a file from the local filesystem to the FTP server.
     * @param localPath The absolute path to the local file to upload.
     * @param remotePath The absolute path on the server where the file should be stored.
     * Throws an error if the upload fails.
     */
    public async uploadFile(localPath: string, remotePath: string): Promise<void> {
        console.log(`Uploading ${localPath} to ${remotePath} via FTP`);
        try {
            await this.ftpClient.uploadFrom(localPath, remotePath);
            console.log("Upload complete.");
        } catch (error) {
            console.error("FTP upload failed:", error);
            throw error;
        }
    }

    /**
     * Reads a file from the FTP server and returns its content as a Buffer.
     * This is useful for processing file content directly in memory.
     * @param remotePath The absolute path to the file on the server to read.
     * @returns A Buffer containing the file's content.
     * Throws an error if the file cannot be read or found.
     */
    public async readFile(remotePath: string): Promise<Buffer> {
        console.log(`Reading file buffer from ${remotePath} via FTP`);
        try {
            const chunks: Buffer[] = [];
            const writable = new Writable({
                write(chunk, encoding, callback) {
                    chunks.push(chunk);
                    callback();
                },
            });
            await this.ftpClient.downloadTo(writable, remotePath);
            const buffer = Buffer.concat(chunks);
            console.log("File buffer read.");
            return buffer;
        } catch (error) {
            console.error("FTP read file buffer failed:", error);
            throw error;
        }
    }

    /**
     * Deletes a file from the FTP server.
     * @param remotePath The absolute path to the file on the server to delete.
     * Throws an error if the deletion fails.
     */
    public async deleteFile(remotePath: string): Promise<void> {
        console.log(`Deleting file ${remotePath} via FTP`);
        try {
            await this.ftpClient.remove(remotePath);
            console.log("File deleted successfully.");
        } catch (error) {
            console.error("FTP delete file failed:", error);
            throw error;
        }
    }

    // Additional FTP operations (e.g., download to local file, listFiles) can be added here as needed.
}

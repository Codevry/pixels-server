import type { TypeFtpConfig } from "@/types/typeStorage.ts";
import { ENUM_STORAGE_TYPE } from "@/utils/enums.ts";
import SFTPClient from "ssh2-sftp-client";
import * as FTPClient from "basic-ftp";

/**
 * Manages FTP and SFTP connections and operations.
 * This class encapsulates the logic for connecting, disconnecting, and performing
 * file transfers (e.g., upload, read) to an FTP or SFTP server based on the provided configuration
 * and specified protocol.
 */
class FtpManager {
    private config: TypeFtpConfig;
    private readonly protocol: ENUM_STORAGE_TYPE;
    private readonly sftpClient: SFTPClient | null = null;
    private readonly ftpClient: FTPClient.Client | null = null;

    /**
     * Initializes a new FtpManager instance.
     * @param config The FTP/SFTP configuration, including host, port, user, and authentication details.
     * @param protocol The storage type, either ENUM_STORAGE_TYPE.ftp or ENUM_STORAGE_TYPE.sftp.
     */
    constructor(config: TypeFtpConfig, protocol: ENUM_STORAGE_TYPE) {
        this.config = config;
        this.protocol = protocol;

        if (this.protocol === ENUM_STORAGE_TYPE.sftp) {
            this.sftpClient = new SFTPClient();
        } else if (this.protocol === ENUM_STORAGE_TYPE.ftp) {
            this.ftpClient = new FTPClient.Client();
            // basic-ftp debug mode
            // this.ftpClient.ftp.verbose = true;
        } else {
            throw new Error("Unsupported protocol for FtpManager: " + protocol);
        }
    }

    /**
     * Establishes a connection to the FTP or SFTP server.
     * It uses the configuration provided during instantiation.
     * Throws an error if the connection fails.
     */
    public async connect(): Promise<void> {
        console.log(
            `Attempting to connect to ${this.protocol.toUpperCase()} host: ${this.config.host}`
        );
        try {
            if (this.protocol === ENUM_STORAGE_TYPE.sftp && this.sftpClient) {
                await this.sftpClient.connect({
                    host: this.config.host,
                    port: this.config.port || 22,
                    username: this.config.user,
                    password: this.config.password,
                    privateKey: this.config.privateKey,
                    passphrase: this.config.passphrase,
                });
            } else if (
                this.protocol === ENUM_STORAGE_TYPE.ftp &&
                this.ftpClient
            ) {
                await this.ftpClient.access({
                    host: this.config.host,
                    port: this.config.port || 21,
                    user: this.config.user,
                    password: this.config.password,
                    secure: false, // Set to true for FTPS (FTP over SSL/TLS)
                    // secureOptions: { rejectUnauthorized: false }, // For self-signed certificates
                });
            }
            console.log(`Connected to ${this.protocol.toUpperCase()}.`);
        } catch (error) {
            console.error(
                `${this.protocol.toUpperCase()} connection failed:`,
                error
            );
            throw error;
        }
    }

    /**
     * Disconnects from the FTP or SFTP server.
     * Throws an error if the disconnection fails.
     */
    public async disconnect(): Promise<void> {
        console.log(`Disconnecting from ${this.protocol.toUpperCase()}.`);
        try {
            if (this.protocol === ENUM_STORAGE_TYPE.sftp && this.sftpClient) {
                await this.sftpClient.end();
            } else if (
                this.protocol === ENUM_STORAGE_TYPE.ftp &&
                this.ftpClient
            ) {
                this.ftpClient.close();
            }
            console.log(`Disconnected from ${this.protocol.toUpperCase()}.`);
        } catch (error) {
            console.error(
                `${this.protocol.toUpperCase()} disconnection failed:`,
                error
            );
            throw error;
        }
    }

    /**
     * Uploads a file from the local filesystem to the FTP or SFTP server.
     * @param localPath The absolute path to the local file to upload.
     * @param remotePath The absolute path on the server where the file should be stored.
     * Throws an error if the upload fails.
     */
    public async upload(localPath: string, remotePath: string): Promise<void> {
        console.log(
            `Uploading ${localPath} to ${remotePath} via ${this.protocol.toUpperCase()}`
        );
        try {
            if (this.protocol === ENUM_STORAGE_TYPE.sftp && this.sftpClient) {
                await this.sftpClient.put(localPath, remotePath);
            } else if (
                this.protocol === ENUM_STORAGE_TYPE.ftp &&
                this.ftpClient
            ) {
                await this.ftpClient.uploadFrom(localPath, remotePath);
            }
            console.log("Upload complete.");
        } catch (error) {
            console.error(
                `${this.protocol.toUpperCase()} upload failed:`,
                error
            );
            throw error;
        }
    }

    /**
     * Reads a file from the FTP or SFTP server and returns its content as a Buffer.
     * This is useful for processing file content directly in memory.
     * @param remotePath The absolute path to the file on the server to read.
     * @returns A Buffer containing the file's content.
     * Throws an error if the file cannot be read or found.
     */
    public async readFileBuffer(remotePath: string): Promise<Buffer> {
        console.log(
            `Reading file buffer from ${remotePath} via ${this.protocol.toUpperCase()}`
        );
        try {
            let buffer: Buffer;
            if (this.protocol === ENUM_STORAGE_TYPE.sftp && this.sftpClient) {
                buffer = (await this.sftpClient.get(remotePath)) as Buffer;
            } else if (
                this.protocol === ENUM_STORAGE_TYPE.ftp &&
                this.ftpClient
            ) {
                // basic-ftp's downloadTo method can take a buffer as the first argument
                const chunks: Buffer[] = [];
                await this.ftpClient.downloadTo(
                    {
                        write: (chunk: Buffer) => {
                            chunks.push(chunk);
                        },
                        end: () => {},
                    },
                    remotePath
                );
                buffer = Buffer.concat(chunks);
            } else {
                throw new Error(
                    "Client not initialized for protocol: " + this.protocol
                );
            }
            console.log("File buffer read.");
            return buffer;
        } catch (error) {
            console.error(
                `${this.protocol.toUpperCase()} read file buffer failed:`,
                error
            );
            throw error;
        }
    }

    // Additional FTP/SFTP operations (e.g., download to local file, listFiles, delete) can be added here as needed.
}

/**
 * Defines a type for a collection of FtpManager instances, keyed by a string identifier.
 * This allows for managing multiple distinct FTP/SFTP connections simultaneously.
 */
export type TypeFtpManager = Record<string, FtpManager>;

export default FtpManager;

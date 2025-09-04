import FtpManager from "../services/ftp";
import { ENUM_STORAGE_TYPE } from "../utils/enums";
import type { TypeFtpConfig } from "../types/typeStorage";
import * as fs from "fs";
import * as path from "path";

// Define a temporary file path for testing uploads
const TEST_FILE_PATH = path.join(import.meta.dir, "test.txt");
const TEST_REMOTE_FILE_NAME = "test_remote_file.txt";
const TEST_FILE_CONTENT = "This is a test file for upload.";

const ftpConfig: TypeFtpConfig = {
    host: "", // e.g., "localhost"
    port: 21, // or your FTP port
    user: "",
    password: "",
    remoteDir: "/", // or a specific directory for tests
};

// IMPORTANT: Replace with your writable SFTP server details
const sftpConfig: TypeFtpConfig = {
    host: "", // e.g., "localhost"
    port: 22, // or your SFTP port
    user: "",
    privateKey: "",
    passphrase: "", // Uncomment and provide if privateKey is encrypted
    remoteDir: "/", // or a specific directory for tests
};

describe("FTP and SFTP Manager Tests", () => {
    // Before all tests, create a dummy file for upload tests
    beforeAll(() => {
        fs.writeFileSync(TEST_FILE_PATH, TEST_FILE_CONTENT);
    });

    // After all tests, clean up the dummy file
    afterAll(() => {
        fs.unlinkSync(TEST_FILE_PATH);
    });

    describe("FTP Operations", () => {
        let ftpManager: FtpManager;

        beforeEach(async () => {
            ftpManager = new FtpManager(ftpConfig, ENUM_STORAGE_TYPE.ftp);
            await ftpManager.connect();
        });

        afterEach(async () => {
            try {
                // Attempt to delete the file if it exists, to clean up after tests
                await ftpManager.deleteFile(TEST_REMOTE_FILE_NAME);
            } catch (error: Error | any) {
                // Ignore error if file doesn't exist, but log others
                if (!error.message.includes("No such file")) {
                    console.warn("Cleanup failed for FTP:", error.message);
                }
            }
            await ftpManager.disconnect();
        });

        test("should upload a file to FTP", async () => {
            await ftpManager.upload(TEST_FILE_PATH, TEST_REMOTE_FILE_NAME);
            // No direct assertion here, subsequent read test will confirm upload
        }, 20000);

        test("should read a file from FTP", async () => {
            // Ensure file exists before reading
            await ftpManager.upload(TEST_FILE_PATH, TEST_REMOTE_FILE_NAME);

            const buffer = await ftpManager.readFileBuffer(
                TEST_REMOTE_FILE_NAME
            );
            const content = buffer.toString();
            expect(content).toBe(TEST_FILE_CONTENT);
        }, 20000);

        test("should delete a file from FTP", async () => {
            // Ensure file exists before deleting
            await ftpManager.upload(TEST_FILE_PATH, TEST_REMOTE_FILE_NAME);

            await ftpManager.deleteFile(TEST_REMOTE_FILE_NAME);

            // Verify deletion by trying to read the file (expecting an error)
            let error: any;
            try {
                await ftpManager.readFileBuffer(TEST_REMOTE_FILE_NAME);
            } catch (e) {
                error = e;
            }
            expect(error).toBeDefined();
            expect(error.message).toContain("No such file");
        }, 20000);
    });

    describe("SFTP Operations", () => {
        let sftpManager: FtpManager;

        beforeEach(async () => {
            sftpManager = new FtpManager(sftpConfig, ENUM_STORAGE_TYPE.sftp);
            await sftpManager.connect();
        });

        afterEach(async () => {
            try {
                // Attempt to delete the file if it exists, to clean up after tests
                await sftpManager.deleteFile(TEST_REMOTE_FILE_NAME);
            } catch (error: Error | any) {
                // Ignore error if file doesn't exist, but log others
                if (!error.message.includes("No such file")) {
                    console.warn("Cleanup failed for SFTP:", error.message);
                }
            }
            await sftpManager.disconnect();
        });

        test("should upload a file to SFTP", async () => {
            await sftpManager.upload(TEST_FILE_PATH, TEST_REMOTE_FILE_NAME);
            // No direct assertion here, subsequent read test will confirm upload
        }, 20000);

        test("should read a file from SFTP", async () => {
            // Ensure file exists before reading
            await sftpManager.upload(TEST_FILE_PATH, TEST_REMOTE_FILE_NAME);

            const buffer = await sftpManager.readFileBuffer(
                TEST_REMOTE_FILE_NAME
            );
            const content = buffer.toString();
            expect(content).toBe(TEST_FILE_CONTENT);
        }, 20000);

        test("should delete a file from SFTP", async () => {
            // Ensure file exists before deleting
            await sftpManager.upload(TEST_FILE_PATH, TEST_REMOTE_FILE_NAME);

            await sftpManager.deleteFile(TEST_REMOTE_FILE_NAME);

            // Verify deletion by trying to read the file (expecting an error)
            let error: any;
            try {
                await sftpManager.readFileBuffer(TEST_REMOTE_FILE_NAME);
            } catch (e) {
                error = e;
            }
            expect(error).toBeDefined();
            expect(error.message).toContain("No such file");
        }, 20000);
    });
});

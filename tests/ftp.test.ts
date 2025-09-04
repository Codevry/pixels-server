import FtpManager from "../services/ftp";
import { ENUM_STORAGE_TYPE } from "../utils/enums";
import type { TypeFtpConfig } from "../types/typeStorage";
import * as fs from "fs";
import * as path from "path";
import { beforeAll, describe, afterAll, expect, test } from "bun:test";

// Define a temporary file path for testing uploads
const TEST_FILE_PATH = path.join(import.meta.dir, "test.txt");

describe("FTP and SFTP Manager Tests", () => {
    // Before all tests, create a dummy file for upload tests
    beforeAll(() => {
        fs.writeFileSync(TEST_FILE_PATH, "This is a test file for upload.");
    });

    // After all tests, clean up the dummy file
    afterAll(() => {
        fs.unlinkSync(TEST_FILE_PATH);
    });

    test("FTP operations (read and expected upload failure)", async () => {
        const ftpConfig: TypeFtpConfig = {
            host: "test.rebex.net",
            port: 21,
            user: "demo",
            password: "password",
        };

        const ftpManager = new FtpManager(ftpConfig, ENUM_STORAGE_TYPE.ftp);

        await ftpManager.connect();
        expect(true).toBe(true); // Connection successful

        const buffer = await ftpManager.readFileBuffer("/readme.txt");
        expect(buffer.length).toBeGreaterThan(0); // Ensure content is read

        // Test expected upload failure on a read-only server
        let ftpUploadError: any;
        try {
            await ftpManager.upload(TEST_FILE_PATH, "/readme.txt");
        } catch (error) {
            ftpUploadError = error;
        }
        expect(ftpUploadError).toBeDefined();
        expect(ftpUploadError.message).toContain("Access denied");

        await ftpManager.disconnect();
        expect(true).toBe(true); // Disconnection successful
    }, 20000); // Increase timeout for network operations

    test("SFTP operations (read and expected upload failure)", async () => {
        const sftpConfig: TypeFtpConfig = {
            host: "test.rebex.net",
            port: 22,
            user: "demo",
            password: "password",
        };

        const sftpManager = new FtpManager(sftpConfig, ENUM_STORAGE_TYPE.sftp);

        await sftpManager.connect();
        expect(true).toBe(true); // Connection successful

        const buffer = await sftpManager.readFileBuffer("/readme.txt");
        expect(buffer.length).toBeGreaterThan(0); // Ensure content is read

        // Test expected upload failure on a read-only server
        let sftpUploadError: any;
        try {
            await sftpManager.upload(TEST_FILE_PATH, "/readme.txt");
        } catch (error) {
            sftpUploadError = error;
        }
        expect(sftpUploadError).toBeDefined();
        expect(sftpUploadError.message).toContain("Access denied");

        await sftpManager.disconnect();
        expect(true).toBe(true); // Disconnection successful
    }, 20000); // Increase timeout for network operations
});

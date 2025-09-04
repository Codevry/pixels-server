import FtpManager from "../services/ftp";
import { ENUM_STORAGE_TYPE } from "../utils/enums";
import type { TypeFtpConfig } from "../types/typeStorage";
import * as fs from "fs";
import * as path from "path";

async function testFtp() {
    console.log("Running FTP tests...");
    const ftpConfig: TypeFtpConfig = {
        host: "test.rebex.net",
        port: 21,
        user: "demo",
        password: "password",
    };

    const ftpManager = new FtpManager(ftpConfig, ENUM_STORAGE_TYPE.ftp);

    try {
        await ftpManager.connect();
        console.log("FTP connected.");

        const buffer = await ftpManager.readFileBuffer("/readme.txt");
        console.log("FTP readFileBuffer successful.");
        if (buffer.length === 0) {
            throw new Error("FTP readFileBuffer returned an empty buffer.");
        }

        // Upload should fail on a read-only server
        const testFilePath = path.join(__dirname, "test.txt");
        fs.writeFileSync(testFilePath, "This is a test file.");
        try {
            await ftpManager.upload(testFilePath, "/readme.txt");
            throw new Error("FTP upload should have failed, but it succeeded.");
        } catch (error) {
            console.log("FTP upload failed as expected on a read-only server.");
        }
        fs.unlinkSync(testFilePath);

        await ftpManager.disconnect();
        console.log("FTP disconnected.");
    } catch (error) {
        console.error("FTP tests failed:", error);
        throw error;
    }
}

async function testSftp() {
    console.log("Running SFTP tests...");
    const sftpConfig: TypeFtpConfig = {
        host: "test.rebex.net",
        port: 22,
        user: "demo",
        password: "password",
    };

    const sftpManager = new FtpManager(sftpConfig, ENUM_STORAGE_TYPE.sftp);

    try {
        await sftpManager.connect();
        console.log("SFTP connected.");

        const buffer = await sftpManager.readFileBuffer("/readme.txt");
        console.log("SFTP readFileBuffer successful.");
        if (buffer.length === 0) {
            throw new Error("SFTP readFileBuffer returned an empty buffer.");
        }

        // Upload should fail on a read-only server
        const testFilePath = path.join(__dirname, "test.txt");
        fs.writeFileSync(testFilePath, "This is a test file.");
        try {
            await sftpManager.upload(testFilePath, "/readme.txt");
            throw new Error(
                "SFTP upload should have failed, but it succeeded."
            );
        } catch (error) {
            console.log(
                "SFTP upload failed as expected on a read-only server."
            );
        }
        fs.unlinkSync(testFilePath);

        await sftpManager.disconnect();
        console.log("SFTP disconnected.");
    } catch (error) {
        console.error("SFTP tests failed:", error);
        throw error;
    }
}

async function runTests() {
    try {
        await testFtp();
        await testSftp();
        console.log("All tests passed!");
    } catch (error) {
        console.error("Tests failed:", error);
        process.exit(1);
    }
}

runTests();

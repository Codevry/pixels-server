/**
 * @file Main server router setup and initialization.
 * Handles configuration validation, storage management, database connections,
 * middleware setup, and route definitions.
 */

import { Hono } from "hono";
import { version } from "@/package.json";
import { logger } from "hono/logger";
import { DbRedis } from "@/services/dbRedis.ts";
import Globals from "@/utils/globals.ts";
import validateConfig from "@/utils/validateConfig.ts";
import S3Manager from "@/services/s3.ts";
import FtpManager from "@/services/ftp.ts"; // Assuming FtpManager exists
import { ENUM_STORAGE_TYPE } from "@/utils/enums.ts";

/**
 * Router class that handles the setup and initialization of the Hono application.
 * Manages configuration validation, storage setup, database connections,
 * middleware configuration, and route definitions.
 */
export default class Router {
    private readonly app: Hono;
    constructor() {
        this.app = new Hono();
    }

    /**
     * Verifies the presence and validity of the config.json file.
     * Exits the process if the config file is not found or is invalid.
     * @private
     */
    private async verifyConfig() {
        console.log("Verifying config.json...");
        try {
            Globals.config = await validateConfig();
            console.log("Config verified successfully.");
        } catch (error) {
            console.error("Failed to verify config.json:", error);
            process.exit(1);
        }
    }

    /**
     * Initializes storage managers based on the configuration settings.
     * Creates appropriate storage manager instances (S3Manager, FtpManager) for each configured storage.
     * Exits the process if the required configuration is missing or a storage type is unsupported.
     *
     * Storage types supported:
     * - S3: Requires s3 configuration object
     * - FTP: Requires ftp configuration object
     * - Local: Currently logs a message only (not implemented)
     * - SFTP: Requires ftp configuration object
     *
     * @private
     * @async
     * @throws {Error} Will exit a process with status 1 if storage configuration is invalid
     */
    private async setStorageManager() {
        for (const [storageName, storageConfig] of Object.entries(
            Globals.config.storage
        )) {
            switch (storageConfig.type) {
                // s3 type
                case ENUM_STORAGE_TYPE.s3:
                    Globals.storage[storageName] = new S3Manager(
                        storageConfig.s3!
                    );
                    break;

                // ftp type
                case ENUM_STORAGE_TYPE.ftp:
                    Globals.storage[storageName] = new FtpManager(
                        storageConfig.ftp!,
                        ENUM_STORAGE_TYPE.ftp
                    );
                    break;

                // sftp type
                case ENUM_STORAGE_TYPE.sftp:
                    Globals.storage[storageName] = new FtpManager(
                        storageConfig.ftp!,
                        ENUM_STORAGE_TYPE.sftp
                    );
                    break;

                // local storage
                case ENUM_STORAGE_TYPE.local:
                    // Local storage might not need a manager class, or it could be a simple path
                    // For now, we'll just log a message. Implement as needed.
                    console.log(
                        `Local storage configured for: ${storageName}. Manager not implemented yet.`
                    );
                    break;
            }
        }
        console.log("Storage managers initialized.");
    }

    /**
     * setup middlewares
     * @private
     */
    private middlewares() {
        this.app.use(logger());
        //this.app.use(MiddlewareUnhandled());
    }

    /**
     * setup routes
     */
    private routes() {
        // ping route
        this.app.on(["GET", "POST"], ["/", "/ping", "/health"], (c) =>
            c.json({ success: true, message: "server is working", version })
        );

        // app routes

        // 404
        this.app.all("*", (c) => {
            c.status(404);
            return c.json({
                success: false,
                message: `route not found ${c.req.path}`,
            });
        });
    }

    /**
     * connect to database & services
     * @private
     */
    private async database() {
        Globals.dbRedis = new DbRedis();
        await Globals.dbRedis
            .connect()
            .then(() => console.log("Connected to Redis"))
            .catch((err) => {
                console.error(err);
                process.exit(1);
            });
    }

    /**
     * setup & return
     */
    /**
     * Initializes and configures the application.
     * Performs the following setup steps in order:
     * 1. Verifies configuration
     * 2. Establishes database connection
     * 3. Sets up storage managers
     * 4. Configures middlewares
     * 5. Defines routes
     *
     * @returns {Promise<Hono>} The configured Hono application instance
     */
    async connect() {
        await this.verifyConfig(); // Verify config as the first step
        await this.database();
        await this.setStorageManager(); // Initialize storage managers
        this.middlewares();
        this.routes();
        return this.app;
    }
}

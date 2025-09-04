/**
 * @file Main router setup and initialization.
 * Handles configuration validation, storage management, database connections,
 * middleware setup, and route definitions.
 */

import { Hono } from "hono";
import { version } from "@/../package.json";
import { logger } from "hono/logger";
import { DbRedis } from "@/services/dbRedis.ts";
import Globals from "@/utils/globals.ts";
import validateConfig from "@/utils/validateConfig.ts";
import { StorageManager } from "@/storage/storageManager.ts";
import { ENUM_STORAGE_TYPE } from "@/utils/enums.ts";
import routeImage from "@/router/routeImage.ts"; // New import

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
        Globals.storage = {} as Record<string, StorageManager>; // Initialize Globals.storage
        for (const [storageName, storageConfig] of Object.entries(
            Globals.config.storage
        )) {
            try {
                const manager = new StorageManager(storageConfig);
                Globals.storage[storageName] = manager;

                if (
                    manager.type === ENUM_STORAGE_TYPE.ftp ||
                    manager.type === ENUM_STORAGE_TYPE.sftp
                ) {
                    await manager.connect();
                    console.log(
                        `Storage manager '${storageName}' (${manager.type}) connected successfully.`
                    );
                } else {
                    console.log(
                        `Storage manager '${storageName}' (${manager.type}) initialized.`
                    );
                }
            } catch (error) {
                console.error(
                    `Failed to initialize storage manager for ${storageName}:`,
                    error
                );
                process.exit(1);
            }
        }
        console.log("All storage managers processed.");
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
            c.json({ success: true, message: "router is working", version })
        );

        // app routes
        this.app.route("/images", routeImage);

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
            .catch((err: any) => {
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
    async connect(): Promise<Hono> {
        await this.verifyConfig(); // Verify config as the first step
        await this.database();
        await this.setStorageManager(); // Initialize storage managers
        this.middlewares();
        this.routes();
        return this.app;
    }
}

/**
 * @file Main router setup and initialization for the Pixels server application.
 * This file orchestrates the application's startup sequence, including configuration validation,
 * storage management setup, database connections, middleware registration, and route definitions.
 */

import { Hono } from "hono";
import { version } from "@/../package.json";
import { logger } from "hono/logger";
import { DbRedis } from "@/services/dbRedis.ts";
import Globals from "@/utils/globals.ts";
import validateConfig from "@/utils/validateConfig.ts";
import { StorageManager } from "@/storage/storageManager.ts";
import { ENUM_STORAGE_TYPE } from "@/utils/enums.ts";
import routeImage from "@/router/routeImage.ts";
import routeBatch from "@/router/routeBatch.ts";
import { MiddlewareUnhandled } from "@/middleware/middlewareUnhandled.ts"; // New import
import routeConfig from "@/router/routeConfig.ts";

/**
 * Router class that handles the setup and initialization of the Hono application.
 * Manages configuration validation, storage setup, database connections,
 * middleware configuration, and route definitions.
 */
export default class Router {
    private readonly app: Hono;

    /**
     * Creates an instance of the Router class.
     * Initializes the Hono application instance.
     */
    constructor() {
        this.app = new Hono();
    }

    /**
     * Verifies the presence and validity of the `config.json` file.
     * This is a critical startup step; if the configuration is invalid or missing,
     * the process will exit with an error.
     * @private
     * @async
     * @returns {Promise<void>} A Promise that resolves if the config is valid, otherwise exits the process.
     */
    private async verifyConfig(): Promise<void> {
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
     * Initializes storage managers based on the application's configuration settings.
     * Creates appropriate storage manager instances (S3Manager, FtpManager, SftpManager) for each configured storage.
     * Establishes connections for FTP/SFTP managers. Exits the process if any required configuration is missing
     * or a storage type is unsupported/fails to initialize.
     *
     * Supported storage types:
     * - S3: Requires `s3` configuration object.
     * - FTP: Requires `ftp` configuration object.
     * - SFTP: Requires `ftp` configuration object.
     * - Local: Currently logs a message only (not fully implemented).
     *
     * @private
     * @async
     * @returns {Promise<void>} A Promise that resolves when all storage managers are initialized and connected.
     * @throws {Error} Will exit the process with status 1 if storage configuration is invalid or connection fails.
     */
    private async setStorageManager(): Promise<void> {
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
     * Sets up global middlewares for the Hono application.
     * This includes logging and unhandled error handling middleware.
     * @private
     * @returns {void}
     */
    private middlewares(): void {
        this.app.use(logger());
        this.app.use(MiddlewareUnhandled());
    }

    /**
     * Defines and registers all application routes with the Hono application.
     * This includes ping routes, image processing routes, batch processing routes,
     * and a fallback 404 route.
     * @private
     * @returns {void}
     */
    private routes(): void {
        // ping route
        this.app.on(["GET", "POST"], ["/", "/ping", "/health"], (c) =>
            c.json({ success: true, message: "router is working", version })
        );

        // app routes
        this.app.route("/images", routeImage);
        this.app.route("/batch", routeBatch);
        this.app.route("/config", routeConfig);

        // 404 fallback route
        this.app.all("*", (c) => {
            c.status(404);
            return c.json({
                success: false,
                message: `route not found ${c.req.path}`,
            });
        });
    }

    /**
     * Establishes connection to the Redis database.
     * This is a critical startup step; if the Redis connection fails,
     * the process will exit with an error.
     * @private
     * @async
     * @returns {Promise<void>} A Promise that resolves if the database connection is successful, otherwise exits the process.
     */
    private async database(): Promise<void> {
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
     * Initializes and configures the entire application.
     * This method orchestrates the sequence of setup steps:
     * 1. Verifies application configuration (`config.json`).
     * 2. Establishes connection to the Redis database.
     * 3. Sets up and connects all configured storage managers.
     * 4. Configures global Hono middlewares.
     * 5. Defines and registers all application routes.
     *
     * @returns {Promise<Hono>} A Promise that resolves with the fully configured Hono application instance.
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

import { Hono } from "hono";
import { ErrorObject } from "@/utils/errorObject.ts";
import { MiddlewareResponse } from "@/middleware/middlewareResponse.ts";
import Globals from "@/utils/globals.ts";
import Silent from "@/utils/silent.ts";
import { nanoid } from "nanoid";

const app = new Hono();

/**
 * Process a batch of image transformations for files in storage.
 *
 * @route POST /process
 * @param {Object} requestBody - The request body
 * @param {string} requestBody.storageName - The name of the storage configuration to use
 * @param {string} requestBody.path - The path to the files in storage to process
 * @param {Object[]} requestBody.transformations - Array of transformation configurations to apply
 */
app.post(
    "/process/directory",
    MiddlewareResponse(async (c) => {
        const { storageName, path, transformations } = await c.req.json();

        if (!storageName || !path || !transformations) {
            throw new ErrorObject(
                400,
                "Missing required parameters: storageName, path, and transformations."
            );
        }

        // generate a unique token
        const token = nanoid();

        // run the function in background
        Silent(
            "batchTransformation",
            Globals.ctrlBatch.batchTransformAndUpload(
                token,
                storageName,
                path,
                transformations
            )
        );

        return c.json({
            success: true,
            message: "Batch processing initiated successfully.",
            token,
        });
    })
);

/**
 * Process a batch of image transformations for a given list of files.
 *
 * @route POST /process/list
 * @param {Object} requestBody - The request body
 * @param {string} requestBody.storageName - The name of the storage configuration to use
 * @param {string[]} requestBody.filePaths - An array of file paths to process
 * @param {Object[]} requestBody.transformations - Array of transformation configurations to apply
 */
app.post(
    "/process/list",
    MiddlewareResponse(async (c) => {
        const { storageName, filePaths, transformations } = await c.req.json();

        if (!storageName || !filePaths || !Array.isArray(filePaths) || filePaths.length === 0 || !transformations) {
            throw new ErrorObject(
                400,
                "Missing required parameters: storageName, filePaths (non-empty array), and transformations."
            );
        }

        // generate a unique token
        const token = nanoid();

        // run the function in background
        Silent(
            "batchTransformationFromList",
            Globals.ctrlBatch.batchTransformAndUploadFromList(
                token,
                storageName,
                filePaths,
                transformations
            )
        );

        return c.json({
            success: true,
            message: "Batch processing from list initiated successfully.",
            token,
        });
    })
);

/**
 * Check the current progress of a batch process.
 *
 * @route GET /progress/:token
 * @param {string} token - The unique token returned by the /process endpoint.
 */
app.get(
    "/progress/:token",
    MiddlewareResponse(async (c) => {
        const token = c.req.param("token");

        if (!token) {
            throw new ErrorObject(400, "Missing token parameter.");
        }

        const progress = await Globals.ctrlBatch.getBatchProgress(token);

        if (!progress) {
            throw new ErrorObject(404, `No progress found for token: ${token}`);
        }

        return c.json({
            success: true,
            progress,
        });
    })
);

export default app;

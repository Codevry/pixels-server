/**
 * @file Defines API routes for batch image processing operations.
 * This includes initiating batch transformations from a directory or a list of files,
 * and checking the progress of ongoing batch processes.
 */

import { Hono } from "hono";
import { ErrorObject } from "@/utils/errorObject.ts";
import { MiddlewareResponse } from "@/middleware/middlewareResponse.ts";
import Globals from "@/utils/globals.ts";
import Silent from "@/utils/silent.ts";
import { nanoid } from "nanoid";

const app = new Hono();

/**
 * POST /process/directory
 * Initiates a batch transformation and upload process for images found in a specified storage directory.
 * The process runs in the background, and a unique token is returned to track its progress.
 *
 * @param {object} requestBody - The request body containing batch processing parameters.
 * @param {string} requestBody.storageName - The name of the storage configuration to use (e.g., 's3_main').
 * @param {string} requestBody.path - The directory path within the storage from which to list and process files.
 * @param {Record<string, any>} requestBody.transformations - A JSON object of transformations to apply to each image.
 * @returns {Response} A JSON response containing a success message and a unique token for tracking progress.
 * @throws {ErrorObject} If required parameters are missing.
 */
app.post(
    "/process/directory",
    MiddlewareResponse(async (c) => {
        // Extract required parameters from request body
        const { storageName, path, transformations } = await c.req.json();

        // Validate that all required parameters are provided
        if (!storageName || !path || !transformations) {
            throw new ErrorObject(
                400,
                "Missing required parameters: storageName, path, and transformations."
            );
        }

        // Generate a unique token for tracking this batch process
        const token = nanoid();

        // Start the batch transformation process asynchronously in the background
        // This allows the API to respond immediately while processing continues
        Silent(
            "batchTransformation",
            Globals.ctrlBatch.batchTransformAndUpload(
                token,
                storageName,
                path,
                transformations
            )
        );

        // Return success response with tracking token
        return c.json({
            success: true,
            message: "Batch processing initiated successfully.",
            token,
        });
    })
);

/**
 * POST /process/list
 * Initiates a batch transformation and upload process for a given list of image file paths.
 * The process runs in the background, and a unique token is returned to track its progress.
 *
 * @param {object} requestBody - The request body containing batch processing parameters.
 * @param {string} requestBody.storageName - The name of the storage configuration to use (e.g., 's3_main').
 * @param {string[]} requestBody.filePaths - An array of full file paths within the storage to process.
 * @param {Record<string, any>} requestBody.transformations - A JSON object of transformations to apply to each image.
 * @returns {Response} A JSON response containing a success message and a unique token for tracking progress.
 * @throws {ErrorObject} If required parameters are missing, or if `filePaths` is not a non-empty array.
 */
app.post(
    "/process/list",
    MiddlewareResponse(async (c) => {
        // Extract required parameters from request body
        const { storageName, filePaths, transformations } = await c.req.json();

        // Validate that all required parameters are provided and filePaths is a non-empty array
        if (
            !storageName ||
            !filePaths ||
            !Array.isArray(filePaths) ||
            filePaths.length === 0 ||
            !transformations
        ) {
            throw new ErrorObject(
                400,
                "Missing required parameters: storageName, filePaths (non-empty array), and transformations."
            );
        }

        // Generate a unique token for tracking this batch process
        const token = nanoid();

        // Start the batch transformation process asynchronously in the background
        // This allows the API to respond immediately while processing continues
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
 * GET /progress/:token
 * Retrieves the current progress and status of a batch image processing operation.
 *
 * @param {string} token - The unique token returned by the `/process/directory` or `/process/list` endpoint.
 * @returns {Response} A JSON response containing the progress details.
 * @throws {ErrorObject} If the token parameter is missing or if no progress is found for the given token.
 */
app.get(
    "/progress/:token",
    MiddlewareResponse(async (c) => {
        // Extract the token from the URL parameters
        const token = c.req.param("token");

        // Validate that the token parameter is provided
        if (!token) {
            throw new ErrorObject(400, "Missing token parameter.");
        }

        // Retrieve the progress information for the given token
        const progress = await Globals.ctrlBatch.getBatchProgress(token);

        // Validate that progress information exists for the token
        if (!progress) {
            throw new ErrorObject(404, `No progress found for token: ${token}`);
        }

        // Return the progress information in a success response
        return c.json({
            success: true,
            progress,
        });
    })
);

export default app;

/**
 * @file Defines API routes for image processing and retrieval.
 * This file sets up routes to handle requests for image transformations,
 * utilizing the `CtrlImage` controller and Hono's middleware for response handling and timeouts.
 */

import { Hono } from "hono"; // Web framework for handling HTTP requests
import CtrlImage from "@/controller/ctrlImage.ts";
import { MiddlewareResponse } from "@/middleware/middlewareResponse.ts";
import { getImageContentType } from "@/utils/functions.ts";
import { timeout } from "hono/timeout";
import Globals from "@/utils/globals.ts"; // Controller for image processing operations

// Initialize Hono router instance
const route = new Hono();

/**
 * GET /:storage/public/:imagePath{.+}
 * Route handler for processing and serving image transformations.
 * This endpoint accepts a storage name and an image path as URL parameters,
 * and applies image transformation operations based on query parameters.
 * It uses a timeout to prevent long-running requests.
 *
 * @param {object} params - The path parameters.
 * @param {string} params.storage - The name of the storage configuration where the image is located.
 * @param {string} params.imagePath - The full path to the image within the specified storage (e.g., 'folder/subfolder/image.jpg').
 * @param {object} queryParams - Query parameters representing image transformation operations (e.g., `?w=100&h=100&format=png`).
 * @returns {Response} The processed image as a Buffer with the appropriate Content-Type header.
 * @throws {ErrorObject} If the image cannot be found, processed, or if parameters are invalid.
 */
route.get(
    "/:storage/public/:imagePath{.+}",
    timeout(30000),
    MiddlewareResponse(async (c) => {
        // Extract storage name from URL parameters
        const { storage } = c.req.param();
        // Extract image path from URL parameters (allows nested paths)
        const location = c.req.param("imagePath");
        // Get all query parameters for image transformations
        const queryParams = c.req.query();
        // Initialize object to store validated query parameters
        const processedQueryParams: Record<string, string> = {};
        // Filter and validate query parameters
        // Only include non-empty string values
        for (const key in queryParams) {
            const value = queryParams[key];
            if (typeof value === "string" && value !== "") {
                processedQueryParams[key] = value;
            }
        }

        // get the image & extension
        const result = await Globals.ctrlImage.getImage(
            location,
            storage!,
            processedQueryParams
        );

        return new Response(result.image as Buffer, {
            headers: {
                "Content-Type": getImageContentType(result.extension),
            },
        });
    })
);

export default route;

/**
 * @file Image processing route handler
 * Defines routes for handling image transformation requests
 * using the Hono framework and CtrlImage controller.
 */

import { Hono } from "hono"; // Web framework for handling HTTP requests
import CtrlImage from "@/controller/ctrlImage.ts";
import { MiddlewareResponse } from "@/middleware/middlewareResponse.ts"; // Controller for image processing operations

// Initialize Hono router instance
const route = new Hono();
// Create instance of image processing controller
const ctrlImage = new CtrlImage();

/**
 * Route handler for processing image transformations.
 * Accepts storage name and image location as URL parameters,
 * and image transformation operations as query parameters.
 * @route GET /image/:storageName/:imageLocation*
 */
route.get(
    "/:storage/public/:imagePath{.+}",
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

        const image = await ctrlImage.getImage(
            location,
            storage!,
            processedQueryParams
        );

        // Set content type based on image extension
        const extension = location.split(".").pop() || "jpeg";
        const contentType = `image/${extension === "jpg" ? "jpeg" : extension}`;

        return new Response(image as Buffer, {
            headers: {
                "Content-Type": contentType,
            },
        });
    })
);

export default route;

import { Hono } from "hono";
import CtrlBatch from "@/controller/ctrlBatch.ts";
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
    "/process",
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

export default app;

/**
 * @file Defines API routes for configuration-related operations.
 * This includes routes for validating storage credentials.
 */

import { Hono } from "hono";
import { CtrlConfig } from "@/controller/ctrlConfig.ts";
import { MiddlewareResponse } from "@/middleware/middlewareResponse.ts";
import Globals from "@/utils/globals.ts";

const route = new Hono();
const ctrl = new CtrlConfig();

/**
 * GET /storage/validate/:storageName
 * Validates the credentials for a specified storage configuration.
 * This endpoint checks if the provided storage name corresponds to a configured storage
 * and if its credentials are valid by attempting to connect or perform a basic operation.
 *
 * @param {object} params - The path parameters.
 * @param {string} params.storageName - The name of the storage configuration to validate.
 * @returns {Response} A JSON response indicating whether the credentials are valid.
 * @throws {ErrorObject} If the storage name is missing, the storage is not found, or credentials are invalid.
 */
route.get(
    "/storage/validate/:storageName",
    MiddlewareResponse((c) => {
        const { storageName } = c.req.param();
        return Globals.ctrlConfig.checkStorageCredentials(storageName!);
    })
);

export default route;
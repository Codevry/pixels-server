/**
 * @file Middleware for handling unhandled errors in Hono applications.
 * This middleware catches exceptions thrown during request processing,
 * converts them into a standardized `ErrorObject` format, logs the error,
 * and sends a consistent JSON error response to the client.
 */

import { createMiddleware } from "hono/factory";
import type { StatusCode } from "hono/utils/http-status";
import { ErrorObject } from "@/utils/errorObject.ts";
import type { MiddlewareHandler } from "hono";

/**
 * Creates a Hono middleware that acts as a centralized error handler.
 * It wraps the `next()` function in a try-catch block. If an error occurs,
 * it checks if the error is an instance of `ErrorObject`. If so, it uses the
 * `ErrorObject`'s status and JSON representation. Otherwise, it creates a new
 * `ErrorObject` with a generic 500 status and an appropriate message.
 * The error is logged to the console, and a JSON error response is sent to the client.
 *
 * @returns {MiddlewareHandler} A Hono middleware handler for unhandled errors.
 */
export function MiddlewareUnhandled(): MiddlewareHandler {
    return createMiddleware(async (c, next) => {
        try {
            // Process the request through the middleware chain
            await next();
        } catch (err) {
            // Create an error object, either from the caught error if it's
            // an ErrorObject instance, or create a new 500 error
            const errorObject =
                err instanceof ErrorObject
                    ? err
                    : new ErrorObject(500, err || "unknown error; try again");

            // Convert error to JSON format and log it
            const errorJson = errorObject.json();
            console.error(errorJson.error);

            // Set response status code and return error as JSON
            c.status(errorObject.status as StatusCode);
            return c.json(errorObject);
        }
    });
}

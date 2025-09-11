/**
 * @file Middleware for handling and standardizing API responses.
 * This middleware wraps route handlers to ensure consistent JSON responses
 * for both successful operations and errors, including proper status codes.
 */

import { createMiddleware } from "hono/factory";
import type { Context, MiddlewareHandler } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { ErrorObject } from "@/utils/errorObject.ts";

/**
 * Creates a Hono middleware that standardizes API responses.
 * It wraps an asynchronous function (`fn`) and handles its successful execution
 * by returning a JSON response with a 200 status code. In case of an error,
 * it catches `ErrorObject` instances to return specific status codes and error messages,
 * or a generic 500 error for unexpected exceptions.
 *
 * @param {(c: Context) => Promise<any>} fn - The asynchronous route handler function to be wrapped.
 *                                          This function receives the Hono `Context` object.
 * @returns {MiddlewareHandler} A Hono middleware handler that processes the response or error.
 */
export function MiddlewareResponse(
    fn: (c: Context) => Promise<any>
): MiddlewareHandler {
    return createMiddleware(async (c) => {
        try {
            // Execute the provided route handler function and await its response
            const response = await fn(c);
            // Set successful status code
            c.status(200);

            // If the response is already a Response instance, return it directly
            if (response instanceof Response) {
                return response;
            }
            // Otherwise, convert the response to JSON format
            return c.json(response);
        } catch (err: ErrorObject | any) {
            // Handle custom ErrorObject instances with their specific status codes
            if (err instanceof ErrorObject) {
                c.status((err.status as StatusCode) || 500);
                return c.json(err.json());
            } else {
                // Handle unexpected errors with a generic 500 Internal Server Error
                c.status(500);
                return c.json({
                    success: false,
                    message: err.message || "something went wrong",
                });
            }
        }
    });
}

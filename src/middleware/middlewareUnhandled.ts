/**
 * @info - basically used to log routes & handle errors
 */
import { createMiddleware } from "hono/factory";
import type { StatusCode } from "hono/utils/http-status";
import { ErrorObject } from "@/utils/errorObject.ts";

export function MiddlewareUnhandled() {
    return createMiddleware(async (c, next) => {
        try {
            await next();
        } catch (err) {
            const errorObject =
                err instanceof ErrorObject
                    ? err
                    : new ErrorObject(500, err || "unknown error; try again");

            const errorJson = errorObject.json();
            console.error(errorJson.error);

            c.status(errorObject.status as StatusCode);
            return c.json(errorObject);
        }
    });
}

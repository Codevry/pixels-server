import { createMiddleware } from "hono/factory";
import type { Context, MiddlewareHandler } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { ErrorObject } from "@/utils/errorObject.ts";

export function MiddlewareResponse(
    fn: (c: Context) => Promise<any>
): MiddlewareHandler {
    return createMiddleware(async (c) => {
        try {
            const response = await fn(c);
            c.status(200);
            return c.json(response);
        } catch (err: ErrorObject | any) {
            if (err instanceof ErrorObject) {
                c.status((err.status as StatusCode) || 500);
                return c.json(err.json());
            } else {
                c.status(500);
                return c.json({
                    success: false,
                    message: err.message || "something went wrong",
                });
            }
        }
    });
}

import { Hono } from "hono";
import { CtrlConfig } from "@/controller/ctrlConfig.ts";
import { MiddlewareResponse } from "@/middleware/middlewareResponse.ts";
import Globals from "@/utils/globals.ts";

const route = new Hono();
const ctrl = new CtrlConfig();

route.get(
    "/storage/validate/:storageName",
    MiddlewareResponse((c) => {
        const { storageName } = c.req.param();
        return Globals.ctrlConfig.checkStorageCredentials(storageName);
    })
);

export default route;

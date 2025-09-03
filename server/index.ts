import { Hono } from "hono";
import { version } from "@/package.json";
import { logger } from "hono/logger";
import { DbRedis } from "@/services/dbRedis.ts";
import Globals from "@/utils/globals.ts";

export default class Router {
    private readonly app: Hono;
    constructor() {
        this.app = new Hono();
    }

    /**
     * setup middlewares
     * @private
     */
    private middlewares() {
        this.app.use(logger());
        //this.app.use(MiddlewareUnhandled());
    }

    /**
     * setup routes
     */
    private routes() {
        // ping route
        this.app.on(["GET", "POST"], ["/", "/ping", "/health"], (c) =>
            c.json({ success: true, message: "server is working", version })
        );

        // app routes

        // 404
        this.app.all("*", (c) => {
            c.status(404);
            return c.json({
                success: false,
                message: `route not found ${c.req.path}`,
            });
        });
    }

    /**
     * connect to database & services
     * @private
     */
    private async database() {
        Globals.dbRedis = new DbRedis();
        await Globals.dbRedis
            .connect()
            .then(() => console.log("connected to redis"))
            .catch((err) => {
                console.error(err);
                process.exit(1);
            });
    }

    /**
     * setup & return
     */
    async connect() {
        await this.database();
        this.middlewares();
        this.routes();
        return this.app;
    }
}

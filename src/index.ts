import Router from "@/router";

const router = new Router();

export default {
    port: 4141,
    fetch: (await router.connect()).fetch,
    idleTimeout: 30,
};

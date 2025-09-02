import Router from "@/server";

const router = new Router();

export default {
    port: 4141,
    fetch: (await router.connect()).fetch,
};

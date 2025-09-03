import type { DbRedis } from "@/services/dbRedis.ts";
import type { TypeConfig } from "@/types/typeConfig.ts";

export default class Globals {
    static dbRedis: DbRedis;
    static config: TypeConfig;
}

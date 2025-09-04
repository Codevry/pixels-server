import type { DbRedis } from "@/services/dbRedis.ts";
import type { TypeConfig } from "@/types/typeConfig.ts";
import type { TypeStorage, TypeStorageManager } from "@/types/typeStorage.ts";

export default class Globals {
    static dbRedis: DbRedis;
    static config: TypeConfig;
    static storage: TypeStorageManager = {} as TypeStorageManager;
}

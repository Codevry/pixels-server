import type { DbRedis } from "@/services/dbRedis.ts";
import type { TypeConfig } from "@/types/typeConfig.ts";
import type { TypeStorageManager } from "@/types/typeStorage.ts";
import CtrlRedis from "@/controller/ctrlRedis.ts";
import CtrlBatch from "@/controller/ctrlBatch.ts";

export default class Globals {
    static dbRedis: DbRedis;
    static config: TypeConfig;
    static storage: TypeStorageManager = {} as TypeStorageManager;
    static ctrlRedis: CtrlRedis = new CtrlRedis();
    static ctrlBatch = new CtrlBatch();
}

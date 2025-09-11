import { ErrorObject } from "@/utils/errorObject.ts";
import Globals from "@/utils/globals.ts";

export class CtrlConfig {
    /**
     * check storage credentials / validate them
     * @param storageName
     */
    public async checkStorageCredentials(storageName?: string) {
        if (!storageName) {
            throw new ErrorObject(400, "Storage name is required.");
        }

        const storageManager = Globals.storage[storageName];

        if (!storageManager) {
            throw new ErrorObject(404, `Storage '${storageName}' not found`);
        }

        await storageManager.checkCredentials();

        return {
            success: true,
            message: `Credentials for '${storageName}' are valid`,
        };
    }
}

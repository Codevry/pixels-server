/**
 * @file Controller for handling configuration-related operations.
 * This includes checking the validity of storage credentials.
 */

import { ErrorObject } from "@/utils/errorObject.ts";
import Globals from "@/utils/globals.ts";

/**
 * Controller class responsible for managing configuration-related tasks.
 * It provides methods to validate storage credentials.
 */
export class CtrlConfig {
    /**
     * Checks the validity of storage credentials for a given storage name.
     * @param {string} [storageName] - The name of the storage configuration to check.
     * @returns {Promise<{ success: boolean; message: string }>} - A Promise that resolves with a success message if credentials are valid.
     * @throws {ErrorObject} - Throws an ErrorObject if the storage name is missing, the storage is not found,
     * or if the credentials are invalid.
     */
    public async checkStorageCredentials(
        storageName: string
    ): Promise<{ success: boolean; message: string }> {
        // Retrieve storage manager instance for the given storage name
        const storageManager = Globals.storage[storageName];

        // Verify that storage manager exists for the provided storage name
        if (!storageManager) {
            throw new ErrorObject(404, `Storage '${storageName}' not found`);
        }

        // Attempt to validate the storage credentials
        await storageManager.checkCredentials();

        // Return success response if credentials are valid
        return {
            success: true,
            message: `Credentials for '${storageName}' are valid`,
        };
    }
}

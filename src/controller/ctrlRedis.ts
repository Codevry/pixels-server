import Globals from "@/utils/globals.ts";

export default class CtrlRedis {
    /**
     * check if converted image exists in cache
     */
    async findImageRef(image: string): Promise<Boolean> {
        return Globals.dbRedis.exists(`processed:image:${image}`);
    }

    /**
     * remove the image path from the cache
     * @param image
     */
    async removeImageRef(image: string): Promise<boolean> {
        return (await Globals.dbRedis.delete(`processed:image:${image}`)) > 0;
    }

    /**
     * save converted image in cache
     * @param image
     */
    async saveImageRef(image: string): Promise<boolean> {
        return (
            (await Globals.dbRedis.create(
                `processed:image:${image}`,
                "true"
            )) == "OK"
        );
    }

    /**
     * Saves batch processing progress to Redis.
     * @param {string} token - Unique token for the batch process.
     * @param {object} progress - The progress object to save.
     * @returns {Promise<boolean>} True if saved successfully, false otherwise.
     */
    async saveProgress(token: string, progress: object): Promise<boolean> {
        try {
            const result = await Globals.dbRedis.create(
                `batch:process:${token}`,
                JSON.stringify(progress)
            );
            return result === "OK";
        } catch (error) {
            console.error(`Failed to save progress for token ${token}:`, error);
            return false;
        }
    }

    /**
     * Retrieves batch processing progress from Redis.
     * @param {string} token - Unique token for the batch process.
     * @returns {Promise<object | null>} The progress object if found, otherwise null.
     */
    async getProgress(token: string): Promise<object | null> {
        try {
            const result = await Globals.dbRedis.get(`batch:process:${token}`);
            if (result) {
                return JSON.parse(result);
            }
            return null;
        } catch (error) {
            console.error(`Failed to get progress for token ${token}:`, error);
            return null;
        }
    }
}

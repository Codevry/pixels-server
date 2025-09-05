import Globals from "@/utils/globals.ts";

export default class CtrlRedis {
    /**
     * check if converted image exists in cache
     */
    async ifImageConverted(image: string): Promise<Boolean> {
        return Globals.dbRedis.exists(`processed:image:${image}`);
    }

    /**
     * remove the image path from the cache
     * @param image
     */
    async removeImageConverted(image: string): Promise<boolean> {
        return (await Globals.dbRedis.delete(`processed:image:${image}`)) > 0;
    }

    /**
     * save converted image in cache
     * @param image
     */
    async saveImageConverted(image: string): Promise<boolean> {
        return (
            (await Globals.dbRedis.create(
                `processed:image:${image}`,
                "true"
            )) == "OK"
        );
    }
}

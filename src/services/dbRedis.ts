import Redis from "ioredis";
import type { TypeRedisStatus } from "@/types/typeRedis.ts";
import { ErrorObject } from "@/utils/errorObject.ts";

export class DbRedis {
    redis: Redis;

    constructor() {
        this.redis = new Redis(Bun.env.REDIS_URL);
    }

    /**
     * get current redis connection status
     */
    status(): TypeRedisStatus {
        return this.redis.status;
    }

    /**
     * wait until the connection is established
     */
    async connect() {
        while (this.status() !== "ready") {
            if (this.status() === "end" || this.status() === "close")
                throw new Error("failed to connect to database");
            else await Bun.sleep(100);
        }

        return true;
    }

    /**
     * create a new key
     * @param key
     * @param value
     */
    async create(key: string, value: string | number | object) {
        try {
            let data;
            data = typeof value === "object" ? JSON.stringify(value) : value;
            return this.redis.set(key, data);
        } catch (e: any) {
            throw new ErrorObject(
                502,
                `issue with redis : ${e?.message || e?.toString()}`
            );
        }
    }

    /**
     * get key
     * @param key
     */
    async get(key: string) {
        try {
            return this.redis.get(key);
        } catch (e: any) {
            throw new ErrorObject(
                502,
                `issue with redis : ${e?.message || e?.toString()}`
            );
        }
    }

    /**
     * check if the key exists
     * @param key
     */
    async exists(key: string) {
        try {
            return (await this.redis.exists(key)) > 0;
        } catch (e: any) {
            throw new ErrorObject(
                502,
                `issue with redis : ${e?.message || e?.toString()}`
            );
        }
    }

    /**
     * delete key
     * @param key
     */
    async delete(key: string) {
        try {
            return this.redis.del(key);
        } catch (e: any) {
            throw new ErrorObject(
                502,
                `issue with redis : ${e?.message || e?.toString()}`
            );
        }
    }

    /**
     * increment value
     * @param key
     * @param value
     */
    async inc(key: string, value: number = 1) {
        try {
            return this.redis.incrby(key, value);
        } catch (e: any) {
            throw new ErrorObject(
                502,
                `issue with redis : ${e?.message || e?.toString()}`
            );
        }
    }

    /**
     * decrement value
     * @param key
     * @param value
     */
    async dec(key: string, value: number = 1) {
        try {
            return this.redis.decrby(key, value);
        } catch (e: any) {
            throw new ErrorObject(
                502,
                `issue with redis : ${e?.message || e?.toString()}`
            );
        }
    }

    /**
     * set ttl for a given key
     * @param key
     * @param ttl - in seconds
     */
    async setTTL(key: string, ttl: number) {
        try {
            return this.redis.expire(key, ttl);
        } catch (e: any) {
            throw new ErrorObject(
                502,
                `issue with redis : ${e?.message || e?.toString()}`
            );
        }
    }

    /**
     * get ttl for a given key
     * @param key
     */
    async getTTL(key: string) {
        try {
            return this.redis.ttl(key);
        } catch (e: any) {
            throw new ErrorObject(
                502,
                `issue with redis : ${e?.message || e?.toString()}`
            );
        }
    }
}

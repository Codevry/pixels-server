/**
 * @file Manages Redis database connections and operations.
 * This service provides a wrapper around the `ioredis` library to handle
 * connection, data storage, retrieval, and manipulation in Redis, including
 * error handling and connection status checks.
 */

import Redis from "ioredis";
import type { TypeRedisStatus } from "@/types/typeRedis.ts";
import { ErrorObject } from "@/utils/errorObject.ts";

/**
 * Manages Redis database connections and provides methods for common Redis operations.
 * Handles connection establishment, data creation, retrieval, existence checks,
 * deletion, increment/decrement, and Time-To-Live (TTL) management.
 */
export class DbRedis {
    redis: Redis;

    /**
     * Creates an instance of DbRedis.
     * Initializes a new Redis client using the REDIS_URL from environment variables.
     */
    constructor() {
        this.redis = new Redis(Bun.env.REDIS_URL);
    }

    /**
     * Gets the current connection status of the Redis client.
     * @returns {TypeRedisStatus} The current status of the Redis connection (e.g., 'ready', 'connecting', 'disconnected').
     */
    status(): TypeRedisStatus {
        return this.redis.status;
    }

    /**
     * Waits until the Redis connection is established and ready.
     * It continuously checks the connection status and throws an error if the connection ends or closes unexpectedly.
     * @returns {Promise<boolean>} A Promise that resolves to `true` when the Redis client is ready.
     * @throws {Error} If the Redis connection fails to establish or closes prematurely.
     */
    async connect(): Promise<boolean> {
        while (this.status() !== "ready") {
            if (this.status() === "end" || this.status() === "close")
                throw new Error("failed to connect to database");
            else await Bun.sleep(100);
        }

        return true;
    }

    /**
     * Creates a new key-value pair in Redis.
     * If the value is an object, it will be stringified to JSON before storage.
     * @param {string} key - The key to store the value under.
     * @param {string | number | object} value - The value to store. Can be a string, number, or object.
     * @returns {Promise<"OK" | null>} A Promise that resolves to "OK" on success, or `null` if the key already exists and was not updated.
     * @throws {ErrorObject} If there is an issue with the Redis operation.
     */
    async create(key: string, value: string | number | object): Promise<"OK" | null> {
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
     * Retrieves the value associated with a given key from Redis.
     * @param {string} key - The key whose value is to be retrieved.
     * @returns {Promise<string | null>} A Promise that resolves to the string value of the key, or `null` if the key does not exist.
     * @throws {ErrorObject} If there is an issue with the Redis operation.
     */
    async get(key: string): Promise<string | null> {
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
     * Checks if a key exists in Redis.
     * @param {string} key - The key to check for existence.
     * @returns {Promise<boolean>} A Promise that resolves to `true` if the key exists, `false` otherwise.
     * @throws {ErrorObject} If there is an issue with the Redis operation.
     */
    async exists(key: string): Promise<boolean> {
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
     * Deletes a key from Redis.
     * @param {string} key - The key to delete.
     * @returns {Promise<number>} A Promise that resolves to the number of keys that were removed.
     * @throws {ErrorObject} If there is an issue with the Redis operation.
     */
    async delete(key: string): Promise<number> {
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
     * Increments the integer value of a key by a specified amount.
     * If the key does not exist, it is set to `value` before the operation.
     * @param {string} key - The key to increment.
     * @param {number} [value=1] - The amount to increment the key's value by. Defaults to 1.
     * @returns {Promise<number>} A Promise that resolves to the new value of the key after the increment.
     * @throws {ErrorObject} If there is an issue with the Redis operation.
     */
    async inc(key: string, value: number = 1): Promise<number> {
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
     * Decrements the integer value of a key by a specified amount.
     * If the key does not exist, it is set to the negative of `value` before the operation.
     * @param {string} key - The key to decrement.
     * @param {number} [value=1] - The amount to decrement the key's value by. Defaults to 1.
     * @returns {Promise<number>} A Promise that resolves to the new value of the key after the decrement.
     * @throws {ErrorObject} If there is an issue with the Redis operation.
     */
    async dec(key: string, value: number = 1): Promise<number> {
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
     * Sets the Time-To-Live (TTL) for a given key in seconds.
     * After the TTL expires, the key will be automatically deleted.
     * @param {string} key - The key to set the TTL for.
     * @param {number} ttl - The time-to-live in seconds.
     * @returns {Promise<number>} A Promise that resolves to 1 if the TTL was set, 0 if the key does not exist or the TTL could not be set.
     * @throws {ErrorObject} If there is an issue with the Redis operation.
     */
    async setTTL(key: string, ttl: number): Promise<number> {
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
     * Retrieves the remaining Time-To-Live (TTL) for a given key in seconds.
     * @param {string} key - The key to get the TTL for.
     * @returns {Promise<number>} A Promise that resolves to the remaining TTL in seconds, -1 if the key exists but has no associated TTL, or -2 if the key does not exist.
     * @throws {ErrorObject} If there is an issue with the Redis operation.
     */
    async getTTL(key: string): Promise<number> {
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
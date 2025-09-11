/**
 * @file This file provides a utility function to validate the application's configuration
 * against a predefined schema using Zod. It ensures that the `config.json` file
 * adheres to the expected structure and types for storage configurations.
 */

import { z } from "zod";
import { ENUM_STORAGE_TYPE } from "@/utils/enums.ts";
import { join } from "path";

// Define Zod schemas for the different configuration types.
// These schemas are used to validate the structure and types of the config.json file.

/**
 * Zod schema for FTP storage configuration.
 * Defines the expected properties and their types for FTP connection details.
 */
const FtpConfigSchema = z.object({
    host: z.string(),
    port: z.number().optional(),
    user: z.string(),
    password: z.string().optional(),
    privateKey: z.string().optional(),
    passphrase: z.string().optional(),
    remoteDir: z.string().optional(),
    convertPath: z.string().optional(),
});

/**
 * Zod schema for S3 storage configuration.
 * Defines the expected properties and their types for S3 bucket details.
 */
const S3ACLSchema = z.enum([
    "private",
    "public-read",
    "public-read-write",
    "aws-exec-read",
    "authenticated-read",
    "bucket-owner-read",
    "bucket-owner-full-control",
    "log-delivery-write",
]);

/**
 * Zod schema for S3 storage configuration.
 * Defines the expected properties and their types for S3 bucket details.
 */
const StorageS3ConfigSchema = z.object({
    bucket: z.string(),
    endpoint: z.string(),
    accessKey: z.string(),
    secretKey: z.string(),
    prefix: z.string(),
    region: z.string(),
    convertPath: z.string().optional(),
    acl: S3ACLSchema,
});

/**
 * Zod schema for a single storage configuration entry.
 * This schema uses `superRefine` to implement conditional validation:
 * - If `type` is 's3', `s3` configuration is required.
 * - If `type` is 'ftp' or 'sftp', `ftp` configuration is required.
 * - If `type` is 'local', a ` local ` path is required.
 */
const StorageConfigSchema = z
    .object({
        type: z.nativeEnum(ENUM_STORAGE_TYPE),
        s3: StorageS3ConfigSchema.optional(),
        ftp: FtpConfigSchema.optional(),
        local: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        if (!data.s3 && !data.ftp && !data.local) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                    "At least one storage configuration (s3, ftp, or local) must be provided",
                path: [],
            });
        }
        if (data.type === ENUM_STORAGE_TYPE.s3 && !data.s3) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "s3 configuration is required when type is s3",
                path: ["s3"],
            });
        }
        if (
            (data.type === ENUM_STORAGE_TYPE.ftp ||
                data.type === ENUM_STORAGE_TYPE.sftp) &&
            !data.ftp
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                    "ftp configuration is required when type is ftp or sftp",
                path: ["ftp"],
            });
        }
        if (data.type === ENUM_STORAGE_TYPE.local && !data.local) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "local path is required when type is local",
                path: ["local"],
            });
        }
    });

/**
 * Zod schema for the overall TypeStorage, which is a record of string keys
 * to `StorageConfigSchema` values. This represents the structure
 * of the storage configuration section within `config.json`.
 */
const TypeStorageSchema = z.record(z.string(), StorageConfigSchema);

/**
 * Zod schema for the top-level application configuration.
 * It expects a `storage` key which is validated by `TypeStorageSchema`.
 * The `.passthrough()` method allows for other keys to be present in the config
 * without strict validation on their types, accommodating future additions.
 */
const AppConfigSchema = z
    .object({
        storage: TypeStorageSchema,
    })
    .passthrough();

/**
 * Validates the application's configuration file (defaulting to `config.json`).
 * Reads the file, parses its JSON content, and validates it against the defined Zod schemas.
 * If validation fails at any stage (file reading, JSON parsing, or schema validation),
 * it logs an error message and exits the process.
 *
 * @param configPath The path to the configuration file. Defaults to "config.json".
 * @returns The parsed and validated storage configuration object if successful.
 */
export default async function validateConfig(
    configPath: string = "config.json"
): Promise<z.infer<typeof AppConfigSchema>> {
    // Construct the absolute path to the configuration file.
    const absoluteConfigPath = join(process.cwd(), configPath);

    let configContent: string;
    try {
        // Attempt to read the content of the configuration file using Bun's file API.
        configContent = await Bun.file(absoluteConfigPath).text();
    } catch (error) {
        // Handle errors during file reading (e.g., file not found, permissions issues).
        console.error(
            `Error: Could not read config file at ${absoluteConfigPath}.`
        );
        console.error(error);
        process.exit(1);
    }

    let parsedConfig: any;
    try {
        // Attempt to parse the file content as JSON.
        parsedConfig = JSON.parse(configContent);
    } catch (error) {
        // Handle errors if the file content is not valid JSON.
        console.error(
            `Error: Could not parse config file at ${absoluteConfigPath}. It might not be a valid JSON.`
        );
        console.error(error);
        process.exit(1);
    }

    try {
        // Validate the parsed configuration object against the AppConfigSchema.
        return AppConfigSchema.parse(parsedConfig);
    } catch (error) {
        // Handle validation errors reported by Zod.
        console.error("Error: Invalid configuration provided.");
        if (error instanceof z.ZodError) {
            // Log detailed validation errors for each invalid field.
            error.errors.forEach((err) => {
                console.error(`- ${err.path.join(".")} : ${err.message}`);
            });
        } else {
            // Log any other unexpected errors during validation.
            console.error(error);
        }
        process.exit(1);
    }
}

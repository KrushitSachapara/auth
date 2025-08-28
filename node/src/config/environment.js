'use strict';

require("dotenv").config();

/**
 * Validates required environment variables and provides default fallbacks.
 */
const validateEnv = (key, defaultValue = undefined, required = false) => {
    if (process.env[key] !== undefined) return process.env[key]; // Use env variable if available

    if (required) {
        console.error(`Missing required environment variable: ${key}`);
        process.exit(1); // Terminate application if a required variable is missing
    }

    return defaultValue; // Use default if provided
};

module.exports = {
    PORT: validateEnv("PORT", 5000),
    MONGODB_URI: validateEnv("MONGODB_URI", "mongodb://localhost:27017/express-mongo", true),

    JWT_SECRET: validateEnv("JWT_SECRET", undefined, true),
    JWT_REFRESH_SECRET: validateEnv("JWT_REFRESH_SECRET", undefined, process.env.USE_REFRESH_TOKENS === "true"),
    JWT_ALGORITHM: validateEnv("JWT_ALGORITHM", "HS256"),

    JWT_ACCESS_EXPIRY_WITH_REFRESH: validateEnv("JWT_ACCESS_EXPIRY_WITH_REFRESH", "15m"),
    JWT_ACCESS_EXPIRY_ONLY: validateEnv("JWT_ACCESS_EXPIRY_ONLY", "24h"),
    JWT_REFRESH_EXPIRY: validateEnv("JWT_REFRESH_EXPIRY", "7d"),
    USE_REFRESH_TOKENS: validateEnv("USE_REFRESH_TOKENS", "false"),
};

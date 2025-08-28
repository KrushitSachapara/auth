'use strict';

const jwt = require("jsonwebtoken");

const {
    JWT_SECRET,
    JWT_REFRESH_SECRET,
    JWT_ALGORITHM,
    JWT_ACCESS_EXPIRY_WITH_REFRESH,
    JWT_ACCESS_EXPIRY_ONLY,
    JWT_REFRESH_EXPIRY,
    USE_REFRESH_TOKENS,
} = require("../config/environment");
const { allowedTokenKeys, guestUser } = require("../utils/constants");

/**
 * Generates JWT tokens (Access & Refresh) based on environment settings.
 *
 * @param {Object} user - User object containing authentication details.
 * @returns {Object} - Object containing accessToken and optionally refreshToken.
 */
const generateAuthToken = async (user = {}) => {
    try {
        if (!JWT_SECRET)
            throw new Error("Authentication error. Please try again.");

        if (!user || typeof user !== "object") user = guestUser;

        const userDetails = allowedTokenKeys.reduce((acc, key) => {
            if (user[key] !== undefined) acc[key] = user[key];

            return acc;
        }, {});

        const accessExpiry = USE_REFRESH_TOKENS === "true" ? JWT_ACCESS_EXPIRY_WITH_REFRESH : JWT_ACCESS_EXPIRY_ONLY;

        const accessToken = jwt.sign({ user: userDetails }, JWT_SECRET, {
            algorithm: JWT_ALGORITHM,
            expiresIn: accessExpiry,
        });

        let refreshToken = null;
        if (USE_REFRESH_TOKENS === "true" && JWT_REFRESH_SECRET) {
            refreshToken = jwt.sign({ user: userDetails }, JWT_REFRESH_SECRET, {
                algorithm: JWT_ALGORITHM,
                expiresIn: JWT_REFRESH_EXPIRY,
            });
        }

        return refreshToken ? { accessToken, refreshToken } : { accessToken };
    } catch (error) {
        console.error("Token Generation Error:", error.message);
        throw new Error("An error occurred while generating authentication credentials.");
    }
};

module.exports = { generateAuthToken };

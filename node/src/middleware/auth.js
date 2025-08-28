const jwt = require("jsonwebtoken");

const { JWT_SECRET, JWT_REFRESH_SECRET, USE_REFRESH_TOKENS, JWT_ACCESS_EXPIRY_WITH_REFRESH } = require("../config/environment");
const { unauthorized } = require("../middleware/response");
const { allowedUrls } = require("../utils/constants");
const { isAllowedUrl } = require("../lib/helper");
const { generateAuthToken } = require("../middleware/token");

/**
 * Middleware to ensure authentication using JWT.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Object} - Calls `next()` if authorized, else returns a secure 401 response.
 */
const ensureAuthorized = async (req, res, next) => {
    try {
        // Allow public routes without authentication
        if (isAllowedUrl(req, allowedUrls)) return next();

        const bearerHeader = req.headers["authorization"];
        if (!bearerHeader) {
            return unauthorized(res, { message: "Authentication is required." });
        }

        const bearerParts = bearerHeader.split(" ");
        if (bearerParts.length !== 2 || bearerParts[0].toLowerCase() !== "bearer") {
            return unauthorized(res, { message: "Invalid authentication format." });
        }

        const accessToken = bearerParts[1];
        if (!accessToken) {
            return unauthorized(res, { message: "Authentication token is missing." });
        }

        // Verify access token
        try {
            const decoded = jwt.verify(accessToken, JWT_SECRET);
            req.user = decoded.user; // Attach user data to request
            return next();
        } catch (error) {
            console.error("JWT Verification Error:", error.message);

            if (error.name === "TokenExpiredError") {
                if (USE_REFRESH_TOKENS === "true") {
                    return handleTokenRefresh(req, res, next);
                }
                return unauthorized(res, { message: "Session expired. Please log in again." });
            } else if (error.name === "JsonWebTokenError") {
                return unauthorized(res, { message: "Invalid authentication credentials." });
            } else if (error.name === "NotBeforeError") {
                return unauthorized(res, { message: "Authentication token is not yet valid." });
            }

            return unauthorized(res, { message: "Authentication failed. Please try again." });
        }
    } catch (error) {
        return unauthorized(res, { message: "An authentication error occurred. Please try again later." });
    }
};

/**
 * Handles token refresh if enabled.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Object} - Returns new access token or unauthorized response.
 */
const handleTokenRefresh = async (req, res, next) => {
    const refreshToken = req.headers["x-refresh-token"];
    if (!refreshToken) {
        return unauthorized(res, { message: "Session expired. Please sign in again." });
    }

    try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

        const { accessToken } = await generateAuthToken(decoded.user);

        res.setHeader("x-access-token", accessToken);
        req.user = decoded.user;
        return next();
    } catch (error) {
        console.error("Refresh Token Verification Error:", error.message);
        return unauthorized(res, { message: "Invalid or expired session. Please log in again." });
    }
};

module.exports = ensureAuthorized;

"use strict";

const { httpStatus } = require("../utils/constants");

const { INTERNAL_SERVER_ERROR } = httpStatus;

/**
 * Sends a standardized error response.
 *
 * @param {Error | Object} error - The error object or custom error details.
 * @param {Object} res - Express response object.
 * @param {number} [statusCode=INTERNAL_SERVER_ERROR] - HTTP status code (default: 500 Internal Server Error).
 * @returns {Object} - Standardized error response.
 */
const errorResponse = (error, res, statusCode = INTERNAL_SERVER_ERROR) => {
    if (!error || !res || typeof res.status !== "function" || typeof res.json !== "function")
        throw new TypeError("Invalid arguments: Expected an error object and an Express response object.");

    // Determine safe error message
    const message = error instanceof Error
        ? error.message
        : (typeof error === "string" ? error : "An unexpected error occurred.");

    // Ensure the status code is valid (4xx or 5xx)
    const validStatusCode = (statusCode >= 400 && statusCode < 600)
        ? statusCode
        : httpStatus.INTERNAL_SERVER_ERROR;

    return res.status(validStatusCode).json({
        isSuccess: false,
        statusCode: validStatusCode,
        message,
    });
};

module.exports = { errorResponse };

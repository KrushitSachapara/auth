'use strict';

const { appendExtraParams } = require("../lib/helper");
const { httpStatus } = require("../utils/constants");

const { OK, BAD_REQUEST, FORBIDDEN, UNAUTHORIZED } = httpStatus;

/**
 * Sends a standardized JSON response.
 *
 * @param {Object} res - Express response object.
 * @param {number} statusCode - HTTP status code.
 * @param {boolean} isSuccess - Indicates if the request was successful.
 * @param {Record<string, any>} [extraParams={}] - Additional parameters to append.
 * @returns {Object} - JSON response.
 */
const sendResponse = (res, statusCode, isSuccess, extraParams = {}) => {
    if (!res || typeof res.status !== 'function' || typeof res.json !== 'function')
        throw new TypeError("Expected 'res' to be an Express response object.");

    const response = { isSuccess, statusCode };
    appendExtraParams(response, extraParams);

    return res.status(statusCode).json(response);
};

// Standardized API Responses
const success = (res, extraParams) => sendResponse(res, OK, true, extraParams);
const badRequest = (res, extraParams) => sendResponse(res, BAD_REQUEST, false, extraParams);
const existsRequest = (res, extraParams) => sendResponse(res, FORBIDDEN, false, extraParams);
const unauthorized = (res, extraParams) => sendResponse(res, UNAUTHORIZED, false, extraParams);

module.exports = {
    success,
    badRequest,
    existsRequest,
    unauthorized
};

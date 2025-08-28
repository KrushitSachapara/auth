'use strict';

const { appendExtraParams } = require('../lib/helper');
const { httpStatus } = require('../utils/constants');

const { NOT_FOUND } = httpStatus;

/**
 * Sends a standardized 404 Not Found response.
 *
 * @param {Object} res - Express response object.
 * @param {Record<string, any>} [extraParams={}] - Additional parameters to append.
 * @returns {Object} - JSON response.
 */
const notFound = (res, extraParams = {}) => {
    if (!res || typeof res.json !== 'function') throw new TypeError("Expected 'res' to be an Express response object.");

    const response = {
        isSuccess: false,
        statusCode: NOT_FOUND,
        message: 'Resource not found!',
    };

    appendExtraParams(response, extraParams);

    return res.json(response);
};

module.exports = { notFound };

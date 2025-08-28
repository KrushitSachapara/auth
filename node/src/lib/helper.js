'use strict';

/**
 * Merges extra parameters into the response object.
 *
 * @param {Record<string, any>} response - The response object to modify.
 * @param {Record<string, any>} [extraParams={}] - Additional parameters to append.
 * @param {boolean} [deepMerge=false] - If true, performs a deep merge instead of a shallow one.
 * @returns {Record<string, any>} - The updated response object.
 * @throws {TypeError} - If response or extraParams is not a valid object.
 */
const appendExtraParams = (response, extraParams = {}, deepMerge = false) => {
    if (!response || typeof response !== 'object' || Array.isArray(response))
        throw new TypeError("Expected 'response' to be a non-null object.");

    if (!extraParams || typeof extraParams !== 'object' || Array.isArray(extraParams))
        throw new TypeError("Expected 'extraParams' to be a non-null object.");

    return deepMerge ? deepMergeObjects(response, extraParams) : Object.assign(response, extraParams);
};

/**
 * Recursively merges two objects (deep merge).
 *
 * @param {Record<string, any>} target - The target object.
 * @param {Record<string, any>} source - The source object.
 * @returns {Record<string, any>} - The deeply merged object.
 */
const deepMergeObjects = (target, source) => {
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key] || typeof target[key] !== 'object') target[key] = {};

            deepMergeObjects(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
};

/**
 * Checks if a request path is allowed (whitelisted) based on `allowedUrls`.
 *
 * @param {Object} req - Express request object.
 * @param {string[]} allowedUrls - List of allowed route prefixes.
 * @returns {boolean} - Returns true if the request path is allowed.
 */
const isAllowedUrl = (req, allowedUrls) => {
    if (!req || !allowedUrls || !Array.isArray(allowedUrls))
        throw new TypeError("Invalid arguments: Expected an Express request object and an array of allowed URLs.");

    // Normalize request path (remove trailing slashes)
    const requestPath = req.path.replace(/\/$/, "");

    return allowedUrls.some((url) => {
        // Normalize allowed URL (remove trailing slashes)
        const normalizedUrl = url.replace(/\/$/, "");
        return requestPath.startsWith(normalizedUrl);
    });
};

module.exports = {
    appendExtraParams,
    isAllowedUrl,
};
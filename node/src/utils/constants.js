'use strict';

const httpStatus = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
};

const roles = {};

const allowedUrls = [];

const allowedTokenKeys = [
    "_id", "firstName", "lastName", "email", "phone", "profilePicture" // Add more keys as needed (e.g., roles)
];

const guestUser = { _id: null, firstName: "Guest", lastName: "User", email: "guest@example.com" };

module.exports = {
    httpStatus,
    roles,
    allowedUrls,
    allowedTokenKeys,
    guestUser,
};
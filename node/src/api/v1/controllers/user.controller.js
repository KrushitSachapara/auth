const userService = require('../services/user.service');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/responses');

const createUser = async (req, res) => {
    try {
        const user = await userService.createUser(req.body);
        sendSuccessResponse(res, 201, 'User created successfully', user);
    } catch (err) {
        sendErrorResponse(res, 500, err.message);
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await userService.getUsers();
        sendSuccessResponse(res, 200, 'Users fetched successfully', users);
    } catch (err) {
        sendErrorResponse(res, 500, err.message);
    }
};

module.exports = {
    createUser,
    getUsers,
};
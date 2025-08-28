const express = require('express');

const router = express.Router();

// Controller
const userController = require('../controllers/userController');

router.post('/create', (req, res) => {
    return userController.user.createUser(req, res);
});

router.post('/get/all', (req, res) => {
    return userController.user.listUser(req, res);
});

router.get('', (req, res) => {
    return userController.user.getUserById(req, res);
});

router.post('/update', (req, res) => {
    return userController.user.updateUser(req, res);
});

router.post('/toggle/status', (req, res) => {
    return userController.user.toggleUserStatus(req, res);
});

module.exports = router;
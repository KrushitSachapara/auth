const express = require('express');

const router = express.Router();

// Controller
const userTypeController = require('../controllers/userTypeController');

router.post('/create', (req, res) => {
    return userTypeController.userType.createUserType(req, res);
});

router.post('/get/all', (req, res) => {
    return userTypeController.userType.listUserType(req, res);
});

router.get('', (req, res) => {
    return userTypeController.userType.getUserTypeById(req, res);
});

router.post('/update', (req, res) => {
    return userTypeController.userType.updateUserType(req, res);
});

router.post('/toggle/status', (req, res) => {
    return userTypeController.userType.toggleUserTypeStatus(req, res);
});

router.get('/options', (req, res) => {
    return userTypeController.userType.userTypeOptions(req, res);
});

module.exports = router;
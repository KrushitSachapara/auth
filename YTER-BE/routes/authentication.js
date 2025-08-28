const express = require('express');

const router = express.Router();

// Controller
const authenticationController = require('../controllers/authenticationController');

router.post('/sign-in', (req, res) => {
    return authenticationController.authentication.signIn(req, res);
});

router.post('/forgot-password', (req, res) => {
    return authenticationController.authentication.sendOTP(req, res);
});

router.post('/verify-otp', (req, res) => {
    return authenticationController.authentication.verifyOTP(req, res);
});

router.post('/reset-password', (req, res) => {
    return authenticationController.authentication.resetPassword(req, res);
});

router.post('/set-password', (req, res) => {
    return authenticationController.authentication.setUserPassword(req, res);
});

router.post('/change-password', (req, res) => {
    return authenticationController.authentication.changeUserPassword(req, res);
});

module.exports = router;
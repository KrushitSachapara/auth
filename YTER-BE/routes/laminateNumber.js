const express = require('express');

const router = express.Router();

// Controller
const laminateNumberController = require('../controllers/laminateNumberController');

router.post('/create', (req, res) => {
    return laminateNumberController.number.createLaminateNumber(req, res);
});

router.post('/get/all', (req, res) => {
    return laminateNumberController.number.listLaminateNumber(req, res);
});

router.get('', (req, res) => {
    return laminateNumberController.number.getLaminateNumberById(req, res);
});

router.post('/update', (req, res) => {
    return laminateNumberController.number.updateLaminateNumber(req, res);
});

router.post('/toggle/status', (req, res) => {
    return laminateNumberController.number.toggleLaminateNumberStatus(req, res);
});

module.exports = router;
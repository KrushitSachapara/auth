const express = require('express');

const router = express.Router();

// Controller
const mrpCalculatorController = require('../controllers/mrpCalculatorController');

router.post('/create', (req, res) => {
    return mrpCalculatorController.mrpCalculator.createMRP(req, res);
});

router.post('/get/all', (req, res) => {
    return mrpCalculatorController.mrpCalculator.listMRPCalculator(req, res);
});

router.get('', (req, res) => {
    return mrpCalculatorController.mrpCalculator.getMRPById(req, res);
});

router.post('/update', (req, res) => {
    return mrpCalculatorController.mrpCalculator.updateMRP(req, res);
});

module.exports = router;
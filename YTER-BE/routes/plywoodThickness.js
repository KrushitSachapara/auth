const express = require('express');

const router = express.Router();

// Controller
const plywoodThicknessController = require('../controllers/plywoodThicknessController');

router.post('/create', (req, res) => {
    return plywoodThicknessController.thickness.createPlywoodThickness(req, res);
});

router.post('/get/all', (req, res) => {
    return plywoodThicknessController.thickness.listPlywoodThickness(req, res);
});

router.get('', (req, res) => {
    return plywoodThicknessController.thickness.getPlywoodThicknessById(req, res);
});

router.post('/update', (req, res) => {
    return plywoodThicknessController.thickness.updatePlywoodThickness(req, res);
});

router.post('/toggle/status', (req, res) => {
    return plywoodThicknessController.thickness.togglePlywoodThicknessStatus(req, res);
});

module.exports = router;
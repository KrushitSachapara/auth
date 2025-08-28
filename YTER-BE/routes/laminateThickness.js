const express = require('express');

const router = express.Router();

// Controller
const laminateThicknessController = require('../controllers/laminateThicknessController');

router.post('/create', (req, res) => {
    return laminateThicknessController.thickness.createLaminateThickness(req, res);
});

router.post('/get/all', (req, res) => {
    return laminateThicknessController.thickness.listLaminateThickness(req, res);
});

router.get('', (req, res) => {
    return laminateThicknessController.thickness.getLaminateThicknessById(req, res);
});

router.post('/update', (req, res) => {
    return laminateThicknessController.thickness.updateLaminateThickness(req, res);
});

router.post('/toggle/status', (req, res) => {
    return laminateThicknessController.thickness.toggleLaminateThicknessStatus(req, res);
});

router.get('/options', (req, res) => {
    return laminateThicknessController.thickness.thicknessOptions(req, res);
});

module.exports = router;
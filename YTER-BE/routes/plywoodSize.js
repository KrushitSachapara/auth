const express = require('express');

const router = express.Router();

// Controller
const plywoodSizeController = require('../controllers/plywoodSizeController');

router.post('/create', (req, res) => {
    return plywoodSizeController.size.createPlywoodSize(req, res);
});

router.post('/get/all', (req, res) => {
    return plywoodSizeController.size.listPlywoodSize(req, res);
});

router.get('', (req, res) => {
    return plywoodSizeController.size.getPlywoodSizeById(req, res);
});

router.post('/update', (req, res) => {
    return plywoodSizeController.size.updatePlywoodSize(req, res);
});

router.post('/toggle/status', (req, res) => {
    return plywoodSizeController.size.togglePlywoodSizeStatus(req, res);
});

module.exports = router;
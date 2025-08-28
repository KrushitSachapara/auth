const express = require('express');

const router = express.Router();

// Controller
const veneerSizeController = require('../controllers/veneerSizeController');

router.post('/create', (req, res) => {
    return veneerSizeController.size.createVeneerSize(req, res);
});

router.post('/get/all', (req, res) => {
    return veneerSizeController.size.listVeneerSize(req, res);
});

router.get('', (req, res) => {
    return veneerSizeController.size.getVeneerSizeById(req, res);
});

router.post('/update', (req, res) => {
    return veneerSizeController.size.updateVeneerSize(req, res);
});

router.post('/toggle/status', (req, res) => {
    return veneerSizeController.size.toggleVeneerSizeStatus(req, res);
});

router.get('/options', (req, res) => {
    return veneerSizeController.size.sizeOptions(req, res);
});

module.exports = router;
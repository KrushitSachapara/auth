const express = require('express');

const router = express.Router();

// Controller
const veneerLotNumberController = require('../controllers/veneerLotNumberController');

router.post('/create', (req, res) => {
    return veneerLotNumberController.lotNumber.createVeneerLotNumber(req, res);
});

router.post('/get/all', (req, res) => {
    return veneerLotNumberController.lotNumber.listVeneerLotNumber(req, res);
});

router.get('', (req, res) => {
    return veneerLotNumberController.lotNumber.getVeneerLotNumberById(req, res);
});

router.post('/update', (req, res) => {
    return veneerLotNumberController.lotNumber.updateVeneerLotNumber(req, res);
});

router.post('/toggle/status', (req, res) => {
    return veneerLotNumberController.lotNumber.toggleVeneerLotNumberStatus(req, res);
});

module.exports = router;
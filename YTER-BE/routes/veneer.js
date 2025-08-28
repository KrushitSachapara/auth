const express = require('express');

const router = express.Router();

// Controller
const veneerController = require('../controllers/veneerController');

router.post('/create', (req, res) => {
    return veneerController.veneer.createVeneer(req, res);
});

router.post('/get/all', (req, res) => {
    return veneerController.veneer.listVeneer(req, res);
});

router.get('', (req, res) => {
    return veneerController.veneer.getVeneerById(req, res);
});

router.post('/update', (req, res) => {
    return veneerController.veneer.updateVeneer(req, res);
});

router.post('/toggle/status', (req, res) => {
    return veneerController.veneer.toggleVeneerStatus(req, res);
});

router.get('/options', (req, res) => {
    return veneerController.veneer.veneerOptions(req, res);
});

router.get('/by-company/options', (req, res) => {
    return veneerController.veneer.getVeneerByCompanyOptions(req, res);
});

router.get('/company/by-veneer', (req, res) => {
    return veneerController.veneer.getCompanyByVeneerOptions(req, res);
});

module.exports = router;
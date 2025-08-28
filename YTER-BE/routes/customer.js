const express = require('express');

const router = express.Router();

// Controller
const customerController = require('../controllers/customerController');

router.post('/create', (req, res) => {
    return customerController.customer.createLedger(req, res);
});

router.post('/get/all', (req, res) => {
    return customerController.customer.listLedger(req, res);
});

router.get('', (req, res) => {
    return customerController.customer.getLedgerById(req, res);
});

router.post('/update', (req, res) => {
    return customerController.customer.updateLedger(req, res);
});

router.post('/toggle/status', (req, res) => {
    return customerController.customer.toggleLedgerStatus(req, res);
});

router.get('/customer/options', (req, res) => {
    return customerController.customer.customerOptions(req, res);
});

router.get('/architect/options', (req, res) => {
    return customerController.customer.architectOptions(req, res);
});

module.exports = router;
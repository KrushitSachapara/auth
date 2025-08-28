const express = require('express');

const router = express.Router();

const priceController = require('../controllers/plywoodPriceController');

router.post('/items/records', (req, res) => {
    return priceController.price.priceItemRecords(req, res);
});

router.post('/create', (req, res) => {
    return priceController.price.createPrice(req, res);
});

router.post('/get/all', (req, res) => {
    return priceController.price.listPrices(req, res);
});

router.post('/update', (req, res) => {
    return priceController.price.updatePrice(req, res);
});

router.post('/toggle/status', (req, res) => {
    return priceController.price.togglePriceStatus(req, res);
});

module.exports = router;
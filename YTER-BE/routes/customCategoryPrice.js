const express = require('express');

const router = express.Router();

const customCategoryPriceController = require('../controllers/customCategoryPriceController');

router.post('/create', (req, res) => {
    return customCategoryPriceController.customCategoryPrice.createCustomCategoryPrice(req, res);
});

router.post('/get/all', (req, res) => {
    return customCategoryPriceController.customCategoryPrice.listCustomCategoryPrices(req, res);
});

router.post('/update', (req, res) => {
    return customCategoryPriceController.customCategoryPrice.updateCustomCategoryPrice(req, res);
});

router.post('/toggle/status', (req, res) => {
    return customCategoryPriceController.customCategoryPrice.toggleCustomCategoryPriceStatus(req, res);
});

router.post('/generate/items', (req, res) => {
    return customCategoryPriceController.customCategoryPrice.generateItemsByCategoryPrice(req, res);
});

module.exports = router;
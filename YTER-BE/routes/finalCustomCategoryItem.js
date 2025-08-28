const express = require('express');

const router = express.Router();

const customCategoryItemController = require('../controllers/finalCustomCategoryItemController');

router.post('/create', (req, res) => {
    return customCategoryItemController.customCategoryItem.createCustomCategoryItem(req, res);
});

router.post('/get/all', (req, res) => {
    return customCategoryItemController.customCategoryItem.listCustomCategoriesItems(req, res);
});

router.post('/toggle/status', (req, res) => {
    return customCategoryItemController.customCategoryItem.toggleCustomCategoryItemStatus(req, res);
});

router.post('/generate', (req, res) => {
    return customCategoryItemController.customCategoryItem.getItemsByFieldsValue(req, res);
});

module.exports = router;
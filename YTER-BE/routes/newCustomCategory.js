const express = require('express');

const router = express.Router();

const newCustomCategoryController = require('../controllers/newCustomCategoryController');

router.post('/create', (req, res) => {
    return newCustomCategoryController.customCategory.createCustomCategory(req, res);
});

router.post('/get/all', (req, res) => {
    return newCustomCategoryController.customCategory.listCustomCategories(req, res);
});

router.get('', (req, res) => {
    return newCustomCategoryController.customCategory.getCustomCategoryById(req, res);
});

router.post('/update', (req, res) => {
    return newCustomCategoryController.customCategory.updateCustomCategory(req, res);
});

router.post('/toggle/status', (req, res) => {
    return newCustomCategoryController.customCategory.toggleCustomCategoryStatus(req, res);
});

router.get('/get/items', (req, res) => {
    return newCustomCategoryController.customCategory.generateItemsByCategory(req, res);
});

router.get('/options', (req, res) => {
    return newCustomCategoryController.customCategory.customCategoryOptions(req, res);
});

module.exports = router;
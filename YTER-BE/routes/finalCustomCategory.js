const express = require('express');

const router = express.Router();

const customCategoryController = require('../controllers/finalCustomCategoryController');

router.post('/create', (req, res) => {
    return customCategoryController.customCategory.createCustomCategory(req, res);
});

router.post('/get/all', (req, res) => {
    return customCategoryController.customCategory.listCustomCategories(req, res);
});

router.get('', (req, res) => {
    return customCategoryController.customCategory.getCustomCategoryById(req, res);
});

router.post('/update', (req, res) => {
    return customCategoryController.customCategory.updateCustomCategory(req, res);
});

router.post('/toggle/status', (req, res) => {
    return customCategoryController.customCategory.toggleCustomCategoryStatus(req, res);
});

router.get('/options', (req, res) => {
    return customCategoryController.customCategory.customCategoryOptions(req, res);
});

module.exports = router;
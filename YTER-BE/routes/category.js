const express = require('express');

const router = express.Router();

const categoryController = require('../controllers/categoryController');

router.post('/create', (req, res) => {
    return categoryController.category.createCategory(req, res);
});

router.post('/get/all', (req, res) => {
    return categoryController.category.listCategories(req, res);
});

router.get('', (req, res) => {
    return categoryController.category.getCategoryById(req, res);
});

router.post('/update', (req, res) => {
    return categoryController.category.updateCategory(req, res);
});

router.post('/toggle/status', (req, res) => {
    return categoryController.category.toggleCategoryStatus(req, res);
});

router.get('/options', (req, res) => {
    return categoryController.category.categoryOptions(req, res);
});

router.get('/by-company/options', (req, res) => {
    return categoryController.category.categoryByCompanyOptions(req, res);
});

router.get('/unique/options', (req, res) => {
    return categoryController.category.uniqueCategoryByCompanyOptions(req, res);
});

module.exports = router;
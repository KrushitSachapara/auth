const express = require('express');

const router = express.Router();

// Controller
const commonCategoryController = require('../controllers/commonCategoryController');

router.post('/create', (req, res) => {
    return commonCategoryController.category.createCommonCategory(req, res);
});

router.post('/get/all', (req, res) => {
    return commonCategoryController.category.listCommonCategory(req, res);
});

router.get('', (req, res) => {
    return commonCategoryController.category.getCommonCategoryById(req, res);
});

router.post('/update', (req, res) => {
    return commonCategoryController.category.updateCommonCategory(req, res);
});

router.post('/toggle/status', (req, res) => {
    return commonCategoryController.category.toggleCommonCategoryStatus(req, res);
});

module.exports = router;
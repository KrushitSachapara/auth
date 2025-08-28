const express = require('express');

const router = express.Router();

const commonFieldsValueController = require('../controllers/commonCategoryFieldsValueController');

router.post('/create', (req, res) => {
    return commonFieldsValueController.commonFieldsValue.createFieldsValue(req, res);
});

router.post('/get/all', (req, res) => {
    return commonFieldsValueController.commonFieldsValue.listFieldsValue(req, res);
});

router.get('', (req, res) => {
    return commonFieldsValueController.commonFieldsValue.getFieldsValue(req, res);
});

router.post('/update', (req, res) => {
    return commonFieldsValueController.commonFieldsValue.updateFieldsValue(req, res);
});

router.post('/toggle/status', (req, res) => {
    return commonFieldsValueController.commonFieldsValue.toggleFieldsValueStatus(req, res);
});

router.get('/items/get', (req, res) => {
    return commonFieldsValueController.commonFieldsValue.itemsByCategory(req, res);
});

module.exports = router;
const express = require('express');

const router = express.Router();

// Controller
const commonItemController = require('../controllers/commonCategoryItemController');

router.post('/create', (req, res) => {
    return commonItemController.commonItem.createItem(req, res);
});

router.post('/get/all', (req, res) => {
    return commonItemController.commonItem.listItems(req, res);
});

router.post('/toggle/status', (req, res) => {
    return commonItemController.commonItem.toggleItemStatus(req, res);
});

module.exports = router;
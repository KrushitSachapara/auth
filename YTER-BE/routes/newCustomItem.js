const express = require('express');

const router = express.Router();

// Controller
const customItemController = require('../controllers/newCustomItemController');

router.post('/create', (req, res) => {
    return customItemController.item.createItem(req, res);
});

router.post('/get/all', (req, res) => {
    return customItemController.item.listItems(req, res);
});

router.get('', (req, res) => {
    return customItemController.item.getItemsById(req, res);
});

router.post('/update', (req, res) => {
    return customItemController.item.updateItem(req, res);
});

router.post('/toggle/status', (req, res) => {
    return customItemController.item.toggleItemStatus(req, res);
});

module.exports = router;
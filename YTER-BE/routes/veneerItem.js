const express = require('express');

const router = express.Router();

// Controller
const itemController = require('../controllers/veneerItemController');

router.post('/model/get/all', (req, res) => {
    return itemController.item.itemsList(req, res);
});

router.post('/create', (req, res) => {
    return itemController.item.createItem(req, res);
});

router.post('/get/all', (req, res) => {
    return itemController.item.listItems(req, res);
});

router.post('/toggle/status', (req, res) => {
    return itemController.item.toggleItemStatus(req, res);
});

module.exports = router;
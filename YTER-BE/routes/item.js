const express = require('express');

const router = express.Router();

// Controller
const itemController = require('../controllers/itemController');

router.post('/model/get/all', (req, res) => {
    return itemController.item.itemsList(req, res);
});

router.post('/create', (req, res) => {
    return itemController.item.createItem(req, res);
});

router.post('/get/all', (req, res) => {
    return itemController.item.listItems(req, res);
});

router.get('', (req, res) => {
    return itemController.item.getCustomCategorItemyById(req, res);
});

router.post('/update', (req, res) => {
    return itemController.item.updateItem(req, res);
});

router.post('/toggle/status', (req, res) => {
    return itemController.item.toggleItemStatus(req, res);
});

// General Book 
router.post('/general/book/list', (req, res) => {
    return itemController.item.generalBookItemsList(req, res);
});

module.exports = router;
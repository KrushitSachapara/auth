const express = require('express');

const router = express.Router();

// Controller
const laminateItemController = require('../controllers/laminateItemController');

router.post('/model/get/all', (req, res) => {
    return laminateItemController.item.itemsList(req, res);
});

router.post('/create', (req, res) => {
    return laminateItemController.item.createItem(req, res);
});

router.post('/get/all', (req, res) => {
    return laminateItemController.item.listItems(req, res);
});

router.post('/toggle/status', (req, res) => {
    return laminateItemController.item.toggleItemStatus(req, res);
});

router.post('/general/book/list', (req, res) => {
    return laminateItemController.item.generalBookItemsList(req, res);
});

module.exports = router;
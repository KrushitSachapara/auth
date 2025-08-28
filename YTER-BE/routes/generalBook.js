const express = require('express');

const router = express.Router();

// Controller
const generalBookController = require('../controllers/generalBookController');

router.post('/create', (req, res) => {
    return generalBookController.generalBook.createGeneralBook(req, res);
});

router.post('/get/all', (req, res) => {
    return generalBookController.generalBook.listGeneralBook(req, res);
});

router.get('', (req, res) => {
    return generalBookController.generalBook.getGeneralBookById(req, res);
});

router.post('/update', (req, res) => {
    return generalBookController.generalBook.updateGeneralBook(req, res);
});

router.post('/toggle/status', (req, res) => {
    return generalBookController.generalBook.toggleGeneralBookStatus(req, res);
});

// Quotation
router.get('/items', (req, res) => {
    return generalBookController.generalBook.getQuotationItemsById(req, res);
});

router.post('/quotation/list', (req, res) => {
    return generalBookController.generalBook.generateQuotationList(req, res);
});

module.exports = router;
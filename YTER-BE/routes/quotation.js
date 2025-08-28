const express = require('express');

const router = express.Router();

// Controller
const quotationController = require('../controllers/quotationController');

router.post('/create', (req, res) => {
    return quotationController.quotation.createQuotation(req, res);
});

router.post('/get/all', (req, res) => {
    return quotationController.quotation.listQuotation(req, res);
});

router.get('', (req, res) => {
    return quotationController.quotation.getQuotationById(req, res);
});

router.post('/update', (req, res) => {
    return quotationController.quotation.updateQuotation(req, res);
});

router.post('/toggle/status', (req, res) => {
    return quotationController.quotation.toggleQuotationStatus(req, res);
});

router.get('/generate', (req, res) => {
    return quotationController.quotation.generateQuotationById(req, res);
});

router.post('/generate/by-items', (req, res) => {
    return quotationController.quotation.generateQuotationListByItems(req, res);
});

router.post('/create-preview', (req, res) => {
    return quotationController.quotation.createAndPreviewQuotation(req, res);
});

router.post('/update-preview', (req, res) => {
    return quotationController.quotation.updateAndPreviewQuotation(req, res);
});

router.get('/options', (req, res) => {
    return quotationController.quotation.quotationOptions(req, res);
});

module.exports = router;
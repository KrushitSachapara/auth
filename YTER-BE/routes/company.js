const express = require('express');

const router = express.Router();

// Controller
const companyController = require('../controllers/companyController');

router.post('/create', (req, res) => {
    return companyController.company.createCompany(req, res);
});

router.post('/get/all', (req, res) => {
    return companyController.company.listCompany(req, res);
});

router.get('', (req, res) => {
    return companyController.company.getCompanyById(req, res);
});

router.post('/update', (req, res) => {
    return companyController.company.updateCompany(req, res);
});

router.post('/toggle/status', (req, res) => {
    return companyController.company.toggleCompanyStatus(req, res);
});

router.post('/search/list', (req, res) => {
    return companyController.company.ListingRecordsBySearch(req, res);
});

router.get('/options', (req, res) => {
    return companyController.company.companyOptions(req, res);
});

router.get('/by-plywood/options', (req, res) => {
    return companyController.company.companyByPlywoodCategory(req, res);
});

router.get('/by-laminate/options', (req, res) => {
    return companyController.company.companyByLaminateCategory(req, res);
});

router.get('/by-veneer/options', (req, res) => {
    return companyController.company.companyByVeneerCategory(req, res);
});

module.exports = router;
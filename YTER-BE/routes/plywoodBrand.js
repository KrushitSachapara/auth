const express = require('express');

const router = express.Router();

// Controller
const plywoodBrandController = require('../controllers/plywoodBrandController');

router.post('/create', (req, res) => {
    return plywoodBrandController.brand.createPlywoodBrand(req, res);
});

router.post('/get/all', (req, res) => {
    return plywoodBrandController.brand.listPlywoodBrand(req, res);
});

router.get('', (req, res) => {
    return plywoodBrandController.brand.getPlywoodBrandById(req, res);
});

router.post('/update', (req, res) => {
    return plywoodBrandController.brand.updatePlywoodBrand(req, res);
});

router.post('/toggle/status', (req, res) => {
    return plywoodBrandController.brand.togglePlywoodBrandStatus(req, res);
});

router.get('/by-company/options', (req, res) => {
    return plywoodBrandController.brand.brandByCompanyOptions(req, res);
});

module.exports = router;
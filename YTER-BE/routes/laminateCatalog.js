const express = require('express');

const router = express.Router();

// Controller
const laminateCatalogController = require('../controllers/laminateCatalogController');

router.post('/create', (req, res) => {
    return laminateCatalogController.catalog.createLaminateCatalog(req, res);
});

router.post('/get/all', (req, res) => {
    return laminateCatalogController.catalog.listLaminateCatalog(req, res);
});

router.get('', (req, res) => {
    return laminateCatalogController.catalog.getLaminateCatalogById(req, res);
});

router.post('/update', (req, res) => {
    return laminateCatalogController.catalog.updateLaminateCatalog(req, res);
});

router.post('/toggle/status', (req, res) => {
    return laminateCatalogController.catalog.toggleLaminateCatalogStatus(req, res);
});

router.get('/options', (req, res) => {
    return laminateCatalogController.catalog.catalogOptions(req, res);
});

router.get('/by-company/options', (req, res) => {
    return laminateCatalogController.catalog.catalogNameByCompanyOptions(req, res);
});

router.get('/company/by-catalog', (req, res) => {
    return laminateCatalogController.catalog.companyByCatalogNameOptions(req, res);
});

router.get('/price-base/by-catalog', (req, res) => {
    return laminateCatalogController.catalog.priceBaseByCatalogNameOptions(req, res);
});

module.exports = router;
const express = require('express');

const router = express.Router();

// Controller
const laminateFinishController = require('../controllers/laminateFinishController');

router.post('/create', (req, res) => {
    return laminateFinishController.finish.createLaminateFinish(req, res);
});

router.post('/get/all', (req, res) => {
    return laminateFinishController.finish.listLaminateFinish(req, res);
});

router.post('/update', (req, res) => {
    return laminateFinishController.finish.updateLaminateFinish(req, res);
});

router.post('/toggle/status', (req, res) => {
    return laminateFinishController.finish.toggleLaminateFinishStatus(req, res);
});

router.get('/by-catalog/options', (req, res) => {
    return laminateFinishController.finish.finishByCatalogOptions(req, res);
});

module.exports = router;
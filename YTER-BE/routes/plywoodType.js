const express = require('express');

const router = express.Router();

// Controller
const plywoodTypeController = require('../controllers/plywoodTypeController');

router.post('/create', (req, res) => {
    return plywoodTypeController.type.createPlywoodType(req, res);
});

router.post('/get/all', (req, res) => {
    return plywoodTypeController.type.listPlywoodType(req, res);
});

router.get('', (req, res) => {
    return plywoodTypeController.type.getPlywoodTypeById(req, res);
});

router.post('/update', (req, res) => {
    return plywoodTypeController.type.updatePlywoodType(req, res);
});

router.post('/toggle/status', (req, res) => {
    return plywoodTypeController.type.togglePlywoodTypeStatus(req, res);
});

router.get('/by-category/options', (req, res) => {
    return plywoodTypeController.type.categoryTypeByCategoryOptions(req, res);
});

router.get('/options', (req, res) => {
    return plywoodTypeController.type.plywoodTypeOptions(req, res);
});

module.exports = router;
const express = require('express');
const router = express.Router();

const userTypeRoute = require('./userType');
const userRoute = require('./user');
const authenticationRoute = require('./authentication');
const categoryRoute = require('./category');
const customCategoryRoute = require('./customCategory');
const newCustomCategoryRoute = require('./newCustomCategory');
const newCustomItemRoute = require('./newCustomItem');
const commonFieldsValueRoute = require('./commonCategoryFieldsValue');
const addCustomCategoryRoute = require('./commonCategory');
const commonCategoryItemsRoute = require('./commonCategoryItem');
const finalCustomCategoryRoute = require('./finalCustomCategory');
const customCategoryPriceRoute = require('./customCategoryPrice');
const finalCustomCategoryItemRoute = require('./finalCustomCategoryItem');
const companyRoute = require('./company');
const ledgerRoute = require('./customer');
const mrpCalculatorRoute = require('./mrpCalculator');
const itemRoute = require('./item');
const generalBookRoute = require('./generalBook');
const quotationRoute = require('./quotation');
// Plywood
const plywoodSizeRoute = require('./plywoodSize');
const plywoodThicknessRoute = require('./plywoodThickness');
const plywoodTypeRoute = require('./plywoodType');
const plywoodPriceRoute = require('./plywoodPrice');
const plywoodBrandRoute = require('./plywoodBrand');
const plywoodItemRoute = require('./plywoodItem');
// Laminate
const laminateCatalogRoute = require('./laminateCatalog');
const laminateFinishRoute = require('./laminateFinish');
const laminateThicknessRoute = require('./laminateThickness');
const laminateNumberRoute = require('./laminateNumber');
const laminateItemRoute = require('./laminateItem');
// Veneer
const veneerRoute = require('./veneer');
const veneerSizeRoute = require('./veneerSize');
const veneerLotNumberRoute = require('./veneerLotNumber');
const veneerItemRoute = require('./veneerItem');


router.use('/user/type', userTypeRoute);
router.use('/user', userRoute);
router.use('/authentication', authenticationRoute);
router.use('/category', categoryRoute);
router.use('/custom/category', customCategoryRoute);
router.use('/new/custom/category', newCustomCategoryRoute);
router.use('/new/custom/item', newCustomItemRoute);
router.use('/common/category/fields/value', commonFieldsValueRoute);
router.use('/common/category', addCustomCategoryRoute);
router.use('/common/item', commonCategoryItemsRoute);
router.use('/final/custom/category', finalCustomCategoryRoute);
router.use('/custom/category/price', customCategoryPriceRoute);
router.use('/custom/category/item', finalCustomCategoryItemRoute);
router.use('/company', companyRoute);
router.use('/ledger', ledgerRoute);
router.use('/mrp/calculator', mrpCalculatorRoute);
router.use('/item', itemRoute);
router.use('/general/book', generalBookRoute);
router.use('/quotation', quotationRoute);
// Plywood
router.use('/plywood/size', plywoodSizeRoute);
router.use('/plywood/thickness', plywoodThicknessRoute);
router.use('/plywood/type', plywoodTypeRoute);
router.use('/plywood/price', plywoodPriceRoute);
router.use('/plywood/brand', plywoodBrandRoute);
router.use('/plywood/item', plywoodItemRoute);
// Laminate
router.use('/laminate/catalog', laminateCatalogRoute);
router.use('/laminate/finish', laminateFinishRoute);
router.use('/laminate/thickness', laminateThicknessRoute);
router.use('/laminate/number', laminateNumberRoute);
router.use('/laminate/item', laminateItemRoute);
// Veneer
router.use('/veneer', veneerRoute);
router.use('/veneer/size', veneerSizeRoute);
router.use('/veneer/lot/number', veneerLotNumberRoute);
router.use('/veneer/item', veneerItemRoute);


module.exports = router;
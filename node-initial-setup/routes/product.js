const express = require("express");
const router = express.Router();

const productController = require("../controllers/ProductController");

router.post("/add", function (req, res) {
  return productController.product.addProduct(req, res);
});

router.post("/update", function (req, res) {
  return productController.product.updateProduct(req, res);
});

router.get("/get", function (req, res) {
  return productController.product.getProducts(req, res);
});

router.delete("/delete", function (req, res) {
  return productController.product.deleteProduct(req, res);
});

router.get("/get-product-by-id", function (req, res) {
  return productController.product.getProductById(req, res);
});

module.exports = router;

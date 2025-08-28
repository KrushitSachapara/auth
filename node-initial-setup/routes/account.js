const express = require("express");
const router = express.Router();

const accountController = require("../controllers/AccountController");

router.post("/login", function (req, res) {
  return accountController.account.login(req, res);
});

router.post("/register", function (req, res) {
  return accountController.account.register(req, res);
});

router.post("/change-password", function (req, res) {
  return accountController.account.changePassword(req, res);
});

router.post("/update-profile", function (req, res) {
  return accountController.account.updateProfile(req, res);
});

router.post("/forget-password", function (req, res) {
  return accountController.account.forgetPassword(req, res);
});

router.post("/verify-otp", function (req, res) {
  return accountController.account.verifyOtpCode(req, res);
});

router.post("/activate-account", function (req, res) {
  return accountController.account.activateAccount(req, res);
});

router.get("/get-all-users", function (req, res) {
  return accountController.account.getAllUsers(req, res);
});

router.get("/get-user-by-id", function (req, res) {
  return accountController.account.getUserById(req, res);
});

router.delete("/delete-user-by-id", function (req, res) {
  return accountController.account.deleteUsers(req, res);
});

module.exports = router;

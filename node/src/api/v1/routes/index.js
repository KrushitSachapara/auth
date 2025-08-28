const express = require('express');
const UserController = require('../controllers/user.controller');
const validateRequest = require('../../../middleware/validateRequest');
const { createUserSchema } = require('../validations/user.validation');

const router = express.Router();

router.get('/users', UserController.getUsers);
router.post('/users', validateRequest(createUserSchema), UserController.createUser);
// Add other CRUD routes

module.exports = router;
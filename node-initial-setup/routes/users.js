const express = require('express')
const router = express.Router()

const userController = require('../controllers/UserController')

router.post('/add', function (req, res) {
  return userController.user.addUser(req, res)
})

router.post('/update', function (req, res) {
  return userController.user.updateUser(req, res)
})

router.get('/get', function (req, res) {
  return userController.user.getUsers(req, res)
})

router.delete('/delete', function (req, res) {
  return userController.user.deleteUser(req, res)
})

router.get('/get-user-by-id', function (req, res) {
  return userController.user.getUserById(req, res)
})

module.exports = router

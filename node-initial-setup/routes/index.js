const express = require('express')
const { ensureAuthorized } = require('../middleware/auth')
const router = express.Router()

const accountRoutes = require('./account')
const studentRoutes = require('./student')
const userRoutes = require('./users')
const productRoutes = require('./product')

router.use('/account', ensureAuthorized, accountRoutes)
router.use('/student', studentRoutes)
router.use('/user', userRoutes)
router.use('/product', productRoutes)

module.exports = router

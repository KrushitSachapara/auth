const mongoose = require('mongoose')
const {
  badRequestResponse,
  successResponse,
  notFoundResponse,
} = require('../middleware/response')
const { decodeUris, cloneDeep } = require('../lib/commonQuery')
const errorResponse = require('../middleware/error-response')
const STUDENT = mongoose.model('products')

exports.product = {
  addProduct: async function (req, res) {
    try {
      req.body = decodeUris(req.body)
      const student = {
        category: req.body.category,
        productName: req.body.productName,
        description: req.body.description,
        price: req.body.price,
        clothSize: req.body.clothSize,
        inStock: req.body.inStock,
      }
      const isCreated = await STUDENT.create(student)
      if (isCreated) {
        return successResponse(res, {
          message: 'Product created successfully',
        })
      } else {
        return badRequestResponse(res, {
          message: 'Failed to create product',
        })
      }
    } catch (error) {
      return errorResponse(error, req, res)
    }
  },
  updateProduct: async function (req, res) {
    try {
      req.body = decodeUris(req.body)
      const studentInfo = await STUDENT.findOne({
        _id: req.body.id,
      })
      if (!studentInfo) {
        return badRequestResponse(res, {
          message: 'Product not found',
        })
      }
      await STUDENT.findOneAndUpdate(
        { _id: studentInfo._id },
        {
          $set: {
            category: req.body.category,
            productName: req.body.productName,
            description: req.body.description,
            price: req.body.price,
            clothSize: req.body.clothSize,
            inStock: req.body.inStock,
          },
        },
      )
      return successResponse(res, {
        message: 'Product updated successfully',
      })
    } catch (error) {
      return errorResponse(error, req, res)
    }
  },
  getProducts: async function (req, res) {
    try {
      req.body = decodeUris(req.body)
      const students = await STUDENT.find({})
      return successResponse(res, {
        data: cloneDeep(students),
      })
    } catch (error) {
      return errorResponse(error, req, res)
    }
  },
  deleteProduct: async function (req, res) {
    try {
      const studentInfo = await STUDENT.findOne({
        _id: req.query.id,
      })
      if (!studentInfo) {
        return badRequestResponse(res, {
          message: 'Product not found',
        })
      }
      await STUDENT.findByIdAndRemove({
        _id: studentInfo._id,
      })
      return successResponse(res, {
        message: 'Product deleted successfully',
      })
    } catch (error) {
      return errorResponse(error, req, res)
    }
  },
  getProductById: async function (req, res) {
    try {
      req.body = decodeUris(req.body)
      const studentInfo = await STUDENT.findOne({
        _id: req.query.id,
      })
      if (!studentInfo) {
        return badRequestResponse(res, {
          message: 'Product not found',
        })
      }
      return successResponse(res, {
        data: cloneDeep(studentInfo),
      })
    } catch (error) {
      return errorResponse(error, req, res)
    }
  },
}

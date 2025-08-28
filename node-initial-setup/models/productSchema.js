'use strict'
var mongoose = require('mongoose')

var ProductSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      default: '',
      trim: true,
    },
    productName: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    clothSize: {
      type: String,
      default: '',
    },
    inStock: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  },
)

var product = mongoose.model('products', ProductSchema)
module.exports = product

'use strict'
var mongoose = require('mongoose')

var EmployeeSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      default: '',
      trim: true,
    },
    lastName: {
      type: String,
      default: '',
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      trim: true,
    },
    hobbies: {
      type: String,
      default: false,
    },
    gender: {
      type: String,
      default: false,
    },
    city: {
      type: String,
      default: false,
    },
    image: {
      type: String,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

var employee = mongoose.model('employee', EmployeeSchema)
module.exports = employee

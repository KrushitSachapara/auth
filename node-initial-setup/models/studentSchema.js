"use strict";
var mongoose = require("mongoose");

var StudentSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      default: "",
      trim: true,
    },
    lastName: {
      type: String,
      default: "",
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
  },
  {
    timestamps: true,
  }
);

var student = mongoose.model("students", StudentSchema);
module.exports = student;

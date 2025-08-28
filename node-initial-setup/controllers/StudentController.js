const mongoose = require('mongoose')
const {
  badRequestResponse,
  successResponse,
  notFoundResponse,
} = require('../middleware/response')
const { decodeUris, cloneDeep } = require('../lib/commonQuery')
const errorResponse = require('../middleware/error-response')
const STUDENT = mongoose.model('students')

exports.student = {
  addStudent: async function (req, res) {
    try {
      req.body = decodeUris(req.body)
      const student = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        age: req.body.age,
        hobbies: req.body.hobbies,
        gender: req.body.gender,
        city: req.body.city,
      }
      const isCreated = await STUDENT.create(student)
      if (isCreated) {
        return successResponse(res, {
          message: 'Student created successfully',
        })
      } else {
        return badRequestResponse(res, {
          message: 'Failed to create student',
        })
      }
    } catch (error) {
      return errorResponse(error, req, res)
    }
  },
  updateStudent: async function (req, res) {
    try {
      req.body = decodeUris(req.body)
      const studentInfo = await STUDENT.findOne({
        _id: req.body.id,
      })
      if (!studentInfo) {
        return badRequestResponse(res, {
          message: 'Student not found',
        })
      }
      await STUDENT.findOneAndUpdate(
        { _id: studentInfo._id },
        {
          $set: {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            age: req.body.age,
            hobbies: req.body.hobbies,
            gender: req.body.gender,
            city: req.body.city,
          },
        },
      )
      return successResponse(res, {
        message: 'Student updated successfully',
      })
    } catch (error) {
      return errorResponse(error, req, res)
    }
  },
  getStudents: async function (req, res) {
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
  deleteStudents: async function (req, res) {
    try {
      const studentInfo = await STUDENT.findOne({
        _id: req.query.id,
      })
      if (!studentInfo) {
        return badRequestResponse(res, {
          message: 'Student not found',
        })
      }
      await STUDENT.findByIdAndRemove({
        _id: studentInfo._id,
      })
      return successResponse(res, {
        message: 'Student deleted successfully',
      })
    } catch (error) {
      return errorResponse(error, req, res)
    }
  },
  getStudentById: async function (req, res) {
    try {
      req.body = decodeUris(req.body)
      const studentInfo = await STUDENT.findOne({
        _id: req.query.id,
      })
      if (!studentInfo) {
        return badRequestResponse(res, {
          message: 'Student not found',
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

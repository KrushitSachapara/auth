const mongoose = require('mongoose')
const {
  badRequestResponse,
  successResponse,
} = require('../middleware/response')
const { decodeUris, cloneDeep, getHost } = require('../lib/commonQuery')
const errorResponse = require('../middleware/error-response')
const STUDENT = mongoose.model('employee')

exports.user = {
  getImageOptions: function (req) {
    let pathDirectory = __dirname.split('\\')
    pathDirectory.pop()
    pathDirectory = pathDirectory.join('\\')
    const uploadedFile = req.files.userImage
    const extension = uploadedFile.name.split('.')[
      uploadedFile.name.split('.').length - 1
    ]
    const fileName = `${new Date().valueOf()}_${Math.ceil(
      Math.random() * 10000,
    )}.${extension}`
    const uploadFilePath = `${pathDirectory}/uploads/${fileName}`
    return {
      fileName,
      uploadFilePath,
      uploadedFile,
    }
  },
  addUser: async function (req, res) {
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
      if (req.files && Object.keys(req.files).length > 0) {
        const fileInfo = this.getImageOptions(req)
        student.image = fileInfo.fileName

        fileInfo.uploadedFile.mv(fileInfo.uploadFilePath, async function (err) {
          if (err)
            return badRequestResponse(res, {
              message: 'Failed to save file',
            })
          const isCreated = await STUDENT.create(student)
          if (isCreated) {
            return successResponse(res, {
              message: 'User created successfully',
            })
          } else {
            return badRequestResponse(res, {
              message: 'Failed to create user',
            })
          }
        })
      } else {
        const isCreated = await STUDENT.create(student)
        if (isCreated) {
          return successResponse(res, {
            message: 'User created successfully',
          })
        } else {
          return badRequestResponse(res, {
            message: 'Failed to create user',
          })
        }
      }
    } catch (error) {
      return errorResponse(error, req, res)
    }
  },
  updateUser: async function (req, res) {
    try {
      req.body = decodeUris(req.body)
      const studentInfo = await STUDENT.findOne({
        _id: req.body.id,
      })
      if (!studentInfo) {
        return badRequestResponse(res, {
          message: 'User not found',
        })
      }
      const student = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        age: req.body.age,
        hobbies: req.body.hobbies,
        gender: req.body.gender,
        city: req.body.city,
      }
      if (req.files && Object.keys(req.files).length > 0) {
        const fileInfo = this.getImageOptions(req)
        student.image = fileInfo.fileName
        fileInfo.uploadedFile.mv(fileInfo.uploadFilePath, async function (err) {
          if (err)
            return badRequestResponse(res, {
              message: 'Failed to save file',
            })
          await STUDENT.findOneAndUpdate(
            { _id: studentInfo._id },
            {
              $set: student,
            },
          )
          return successResponse(res, {
            message: 'User updated successfully',
          })
        })
      } else {
        await STUDENT.findOneAndUpdate(
          { _id: studentInfo._id },
          {
            $set: student,
          },
        )
        return successResponse(res, {
          message: 'User updated successfully',
        })
      }
    } catch (error) {
      return errorResponse(error, req, res)
    }
  },
  getUsers: async function (req, res) {
    try {
      req.body = decodeUris(req.body)
      let students = await STUDENT.find({})
      students = cloneDeep(students)
      students.map((x) => {
        if (x.image) {
          x.image = `${getHost(req)}/uploads/${x.image}`
        }
      })
      return successResponse(res, {
        data: students,
      })
    } catch (error) {
      return errorResponse(error, req, res)
    }
  },
  deleteUser: async function (req, res) {
    try {
      const studentInfo = await STUDENT.findOne({
        _id: req.query.id,
      })
      if (!studentInfo) {
        return badRequestResponse(res, {
          message: 'User not found',
        })
      }
      await STUDENT.findByIdAndRemove({
        _id: studentInfo._id,
      })
      return successResponse(res, {
        message: 'User deleted successfully',
      })
    } catch (error) {
      return errorResponse(error, req, res)
    }
  },
  getUserById: async function (req, res) {
    try {
      req.body = decodeUris(req.body)
      let studentInfo = await STUDENT.findOne({
        _id: req.query.id,
      })
      if (!studentInfo) {
        return badRequestResponse(res, {
          message: 'User not found',
        })
      }
      studentInfo = cloneDeep(studentInfo)
      studentInfo.image = `${getHost(req)}/uploads/${studentInfo.image}`
      return successResponse(res, {
        data: studentInfo,
      })
    } catch (error) {
      return errorResponse(error, req, res)
    }
  },
}

const express = require("express");
const router = express.Router();

const studentController = require("../controllers/StudentController");

router.post("/add", function (req, res) {
  return studentController.student.addStudent(req, res);
});

router.post("/update", function (req, res) {
  return studentController.student.updateStudent(req, res);
});

router.get("/get", function (req, res) {
  return studentController.student.getStudents(req, res);
});

router.delete("/delete", function (req, res) {
  return studentController.student.deleteStudents(req, res);
});

router.get("/get-student-by-id", function (req, res) {
  return studentController.student.getStudentById(req, res);
});

module.exports = router;

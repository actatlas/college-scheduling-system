const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
} = require('../controllers/students.controller');

const router = express.Router();

// Apply authMiddleware globally to all student routes
router.use(authMiddleware);

// Admin-only endpoints
router.get('/', listStudents);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

module.exports = router;

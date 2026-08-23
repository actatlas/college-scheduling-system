const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { listCourses, createCourse, updateCourse, deleteCourse } = require('../controllers/courses.controller');

const router = express.Router();
router.use(authMiddleware);

router.get('/', listCourses);
router.post('/', createCourse);
router.put('/:code', updateCourse);
router.delete('/:code', deleteCourse);

module.exports = router;



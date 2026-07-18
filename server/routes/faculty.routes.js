const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { listFaculty, createFaculty, updateFaculty } = require('../controllers/faculty.controller');

const router = express.Router();
router.use(authMiddleware);

router.get('/', listFaculty);
router.post('/', createFaculty);
router.put('/:id', updateFaculty);

module.exports = router;


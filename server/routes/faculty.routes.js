const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { listFaculty, createFaculty, updateFaculty, deleteFaculty } = require('../controllers/faculty.controller');

const router = express.Router();
router.use(authMiddleware);

router.get('/', listFaculty);
router.post('/', createFaculty);
router.put('/:id', updateFaculty);
router.delete('/:id', deleteFaculty);

module.exports = router;


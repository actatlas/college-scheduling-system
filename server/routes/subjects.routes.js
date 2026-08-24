const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { listSubjects, createSubject, updateSubject, deleteSubject } = require('../controllers/subjects.controller');

const router = express.Router();
router.use(authMiddleware);

router.get('/', listSubjects);
router.post('/', createSubject);
router.delete('/:code', deleteSubject);
router.put('/:code', updateSubject);

module.exports = router;


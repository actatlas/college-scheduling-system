const express = require('express');
const { listSubjects, createSubject } = require('../controllers/subjects.controller');

const router = express.Router();
router.get('/', listSubjects);
router.post('/', createSubject);
router.delete('/:code', require('../controllers/subjects.controller').deleteSubject);
router.put('/:code', require('../controllers/subjects.controller').updateSubject);

module.exports = router;


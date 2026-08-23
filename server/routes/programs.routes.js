const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { listPrograms, createProgram, updateProgram, deleteProgram } = require('../controllers/programs.controller');

const router = express.Router();
router.use(authMiddleware);

router.get('/', listPrograms);
router.post('/', createProgram);
router.put('/:code', updateProgram);
router.delete('/:code', deleteProgram);

module.exports = router;


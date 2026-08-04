const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  listProgramMajors,
  getProgramMajorById,
  createProgramMajor,
  updateProgramMajor,
  deleteProgramMajor,
} = require('../controllers/programMajors.controller');

const router = express.Router();
router.use(authMiddleware);
router.get('/', listProgramMajors);
router.get('/:id', getProgramMajorById);
router.post('/', createProgramMajor);
router.put('/:id', updateProgramMajor);
router.delete('/:id', deleteProgramMajor);

module.exports = router;

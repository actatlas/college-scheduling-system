const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  listYearLevels,
  getYearLevelById,
  createYearLevel,
  updateYearLevel,
  deleteYearLevel,
} = require('../controllers/yearLevels.controller');

const router = express.Router();
router.use(authMiddleware);
router.get('/', listYearLevels);
router.get('/:id', getYearLevelById);
router.post('/', createYearLevel);
router.put('/:id', updateYearLevel);
router.delete('/:id', deleteYearLevel);

module.exports = router;

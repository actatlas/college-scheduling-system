const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  listExamSchedules,
  createExamSchedule,
  updateExamSchedule,
  deleteExamSchedule,
  getExamPeriodSettings,
  updateExamPeriodSettings,
} = require('../controllers/examSchedules.controller');

const router = express.Router();
router.use(authMiddleware);

router.get('/period-settings', getExamPeriodSettings);
router.put('/period-settings', updateExamPeriodSettings);
router.get('/', listExamSchedules);
router.post('/', createExamSchedule);
router.put('/:id', updateExamSchedule);
router.delete('/:id', deleteExamSchedule);

module.exports = router;


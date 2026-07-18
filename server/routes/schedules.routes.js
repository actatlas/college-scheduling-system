const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  listSchedules,
  generateSchedules,
  listConflicts,
  createSchedule,
  deleteSchedule,
  updateSchedule,
} = require('../controllers/schedules.controller');

const router = express.Router();
router.use(authMiddleware);
router.get('/', listSchedules);
router.post('/generate', generateSchedules);
router.get('/conflicts', listConflicts);

// Allow creating and deleting individual schedule entries
router.post('/', createSchedule);
router.delete('/:id', deleteSchedule);
router.put('/:id', updateSchedule);

module.exports = router;


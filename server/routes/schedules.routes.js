const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  listSchedules,
  generateSchedules,
  listConflicts,
  createSchedule,
  deleteSchedule,
  updateSchedule,
  finalizeSchedule,
  publishSchedule,
  bulkUpdateScheduleStatus,
} = require('../controllers/schedules.controller');

const router = express.Router();
router.use(authMiddleware);
router.get('/', listSchedules);
router.post('/generate', generateSchedules);
router.get('/conflicts', listConflicts);

// Bulk status management
router.post('/bulk-status', bulkUpdateScheduleStatus);

// Individual schedule lifecycle management
router.post('/:id/finalize', finalizeSchedule);
router.post('/:id/publish', publishSchedule);

// Allow creating, updating and deleting individual schedule entries
router.post('/', createSchedule);
router.delete('/:id', deleteSchedule);
router.put('/:id', updateSchedule);

module.exports = router;


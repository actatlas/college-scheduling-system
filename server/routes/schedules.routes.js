const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  listSchedules,
  generateSchedules,
  listConflicts,
  createSchedule,
  deleteSchedule,
  bulkDeleteSchedules,
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

// Bulk operations
router.post('/bulk-status', bulkUpdateScheduleStatus);
router.post('/bulk-delete', bulkDeleteSchedules);
router.delete('/bulk', bulkDeleteSchedules);

// Individual schedule lifecycle management
router.post('/:id/finalize', finalizeSchedule);
router.post('/:id/publish', publishSchedule);

// Allow creating, updating and deleting individual schedule entries
router.post('/', createSchedule);
router.delete('/:id', deleteSchedule);
router.put('/:id', updateSchedule);

module.exports = router;


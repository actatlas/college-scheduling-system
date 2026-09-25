const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  dispatchScheduleToFaculty,
  dispatchAllFacultySchedules,
  getFacultyScheduleDetails,
  getFacultyExamScheduleDetails,
  dispatchExamScheduleToFaculty,
} = require('../services/facultyDispatch.service');

const router = express.Router();
router.use(authMiddleware);

// GET /api/faculty-dispatch/preview/:teacherId - Preview email payload before dispatching class schedule
router.get('/preview/:teacherId', async (req, res, next) => {
  try {
    const details = await getFacultyScheduleDetails(req.params.teacherId);
    res.json({ data: details });
  } catch (err) {
    next(err);
  }
});

// GET /api/faculty-dispatch/exams/preview/:teacherId - Preview email payload before dispatching exam schedule
router.get('/exams/preview/:teacherId', async (req, res, next) => {
  try {
    const details = await getFacultyExamScheduleDetails(req.params.teacherId);
    res.json({ data: details });
  } catch (err) {
    next(err);
  }
});

// POST /api/faculty-dispatch/send - Dispatch email notification to a single faculty member
router.post('/send', async (req, res, next) => {
  try {
    const { teacherId, recipientEmail, customNotes } = req.body;
    if (!teacherId) {
      return res.status(400).json({
        error: 'Teacher / Faculty ID is required.',
        code: 'MISSING_FACULTY_ID',
      });
    }

    const payload = await dispatchScheduleToFaculty({
      teacherId,
      recipientEmail,
      customNotes,
      req,
    });

    res.json({
      message: `Schedule successfully dispatched to ${payload.facultyName} (${payload.to}) via institutional Gmail.`,
      data: payload,
    });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    next(err);
  }
});

// POST /api/faculty-dispatch/exams/send - Dispatch exam proctoring email to a faculty member
router.post('/exams/send', async (req, res, next) => {
  try {
    const { teacherId, recipientEmail, customNotes } = req.body;
    if (!teacherId) {
      return res.status(400).json({
        error: 'Teacher / Faculty ID is required.',
        code: 'MISSING_FACULTY_ID',
      });
    }

    const payload = await dispatchExamScheduleToFaculty({
      teacherId,
      recipientEmail,
      customNotes,
      req,
    });

    res.json({
      message: `Examination schedule successfully dispatched to proctor ${payload.facultyName} (${payload.to}) via institutional email.`,
      data: payload,
    });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    next(err);
  }
});

// POST /api/faculty-dispatch/batch - Batch dispatch to all assigned faculty members
router.post('/batch', async (req, res, next) => {
  try {
    const result = await dispatchAllFacultySchedules({
      programCode: req.body?.programCode,
      req,
    });

    res.json({
      message: `Batch dispatched schedules to ${result.totalDispatched} faculty members via Gmail.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

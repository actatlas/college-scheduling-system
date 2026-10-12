const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  listFacultyScheduleGroups,
  getFacultyScheduleDetails,
  generateFacultySchedulePdf,
  dispatchScheduleToFaculty,
  publishAndDispatchAllFacultySchedules,
  resendFacultySchedule,
  getFacultyExamScheduleDetails,
  dispatchExamScheduleToFaculty,
} = require('../services/facultyDispatch.service');

const router = express.Router();
router.use(authMiddleware);

// GET /api/faculty-dispatch - List all faculty schedule groups with status and filtering
router.get('/', async (req, res, next) => {
  try {
    const { program, status, search, term } = req.query;
    const list = await listFacultyScheduleGroups({
      user: req.user,
      program,
      status,
      search,
      term,
    });
    res.json({ data: list });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    next(err);
  }
});

// GET /api/faculty-dispatch/:teacherId - Get individual faculty schedule details
router.get('/:teacherId', async (req, res, next) => {
  try {
    const details = await getFacultyScheduleDetails(req.params.teacherId, {
      user: req.user,
      onlyPublished: req.query.onlyPublished === 'true',
    });
    res.json({ data: details });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    next(err);
  }
});

// GET /api/faculty-dispatch/:teacherId/pdf - Generate and stream individual faculty schedule PDF
router.get('/:teacherId/pdf', async (req, res, next) => {
  try {
    const pdfData = await generateFacultySchedulePdf(req.params.teacherId, {
      user: req.user,
      onlyPublished: req.query.onlyPublished === 'true',
      customNotes: req.query.customNotes || '',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${pdfData.filename}"`);
    res.setHeader('Content-Length', pdfData.buffer.length);
    res.send(pdfData.buffer);
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    next(err);
  }
});

// POST /api/faculty-dispatch/publish-and-send - Bulk publish and dispatch schedules to all faculty
router.post('/publish-and-send', async (req, res, next) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({
        error: 'Forbidden: Only Administrators have college-wide authority to publish and dispatch faculty schedules.',
        code: 'UNAUTHORIZED_ROLE',
      });
    }

    const result = await publishAndDispatchAllFacultySchedules({
      user: req.user,
      req,
      programCode: req.body?.programCode,
      customNotes: req.body?.customNotes,
    });

    res.json({
      message: `Successfully processed faculty schedule publication and dispatch for ${result.totalFaculty} faculty members.`,
      data: result,
    });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    next(err);
  }
});

// POST /api/faculty-dispatch/:teacherId/send - Dispatch schedule to single faculty member
router.post('/:teacherId/send', async (req, res, next) => {
  try {
    const payload = await dispatchScheduleToFaculty({
      teacherId: req.params.teacherId,
      recipientEmail: req.body?.recipientEmail,
      customNotes: req.body?.customNotes,
      req,
      onlyPublished: false,
    });

    res.json({
      message: payload.deliveryStatus === 'SENT'
        ? `Schedule successfully dispatched to ${payload.facultyName} (${payload.to}) via institutional Gmail.`
        : `Schedule PDF generated successfully, but email transmission was not delivered: ${payload.error}`,
      data: payload,
    });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    next(err);
  }
});

// POST /api/faculty-dispatch/:teacherId/resend - Resend schedule to single faculty member
router.post('/:teacherId/resend', async (req, res, next) => {
  try {
    const payload = await resendFacultySchedule({
      teacherId: req.params.teacherId,
      recipientEmail: req.body?.recipientEmail,
      customNotes: req.body?.customNotes,
      user: req.user,
      req,
    });

    res.json({
      message: payload.deliveryStatus === 'SENT'
        ? `Schedule successfully resent to ${payload.facultyName} (${payload.to}) via Gmail.`
        : `Schedule PDF regenerated, but email resend could not be delivered: ${payload.error}`,
      data: payload,
    });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    next(err);
  }
});

// Backwards-compatible legacy endpoints
router.get('/preview/:teacherId', async (req, res, next) => {
  try {
    const details = await getFacultyScheduleDetails(req.params.teacherId, { user: req.user });
    res.json({ data: details });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    next(err);
  }
});

router.post('/send', async (req, res, next) => {
  try {
    const { teacherId, recipientEmail, customNotes } = req.body;
    if (!teacherId) {
      return res.status(400).json({ error: 'Teacher / Faculty ID is required.', code: 'MISSING_FACULTY_ID' });
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

router.post('/batch', async (req, res, next) => {
  try {
    const result = await publishAndDispatchAllFacultySchedules({
      user: req.user,
      req,
      programCode: req.body?.programCode,
    });
    res.json({
      message: `Batch dispatched schedules to ${result.totalFaculty} faculty members.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/exams/preview/:teacherId', async (req, res, next) => {
  try {
    const details = await getFacultyExamScheduleDetails(req.params.teacherId);
    res.json({ data: details });
  } catch (err) {
    next(err);
  }
});

router.post('/exams/send', async (req, res, next) => {
  try {
    const { teacherId, recipientEmail, customNotes } = req.body;
    if (!teacherId) {
      return res.status(400).json({ error: 'Teacher / Faculty ID is required.', code: 'MISSING_FACULTY_ID' });
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

module.exports = router;

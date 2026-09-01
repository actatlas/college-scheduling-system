const { examSchedulesService } = require('../services/examSchedules.service');

async function listExamSchedules(req, res, next) {
  try {
    const data = await examSchedulesService.listExamSchedules({
      user: req.user,
      program: req.query.program,
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}


async function createExamSchedule(req, res, next) {
  try {
    if (!['admin', 'super_admin', 'program_head'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators and Program Heads can create exam schedules.', code: 'UNAUTHORIZED_ROLE' });
    }
    const data = await examSchedulesService.createExamSchedule(req.body, req.user);
    res.status(201).json({ data });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code || 'VALIDATION_ERROR' });
    next(err);
  }
}

async function updateExamSchedule(req, res, next) {
  try {
    if (!['admin', 'super_admin', 'program_head'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators and Program Heads can update exam schedules.', code: 'UNAUTHORIZED_ROLE' });
    }
    const data = await examSchedulesService.updateExamSchedule(req.params.id, req.body, req.user);
    res.json({ data });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code || 'VALIDATION_ERROR' });
    next(err);
  }
}

async function deleteExamSchedule(req, res, next) {
  try {
    if (!['admin', 'super_admin', 'program_head'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators and Program Heads can delete exam schedules.', code: 'UNAUTHORIZED_ROLE' });
    }
    await examSchedulesService.deleteExamSchedule(req.params.id, req.user);
    res.json({ message: 'Exam schedule deleted successfully' });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code || 'VALIDATION_ERROR' });
    next(err);
  }
}

async function getExamPeriodSettings(req, res, next) {
  try {
    const data = await examSchedulesService.getExamPeriodSettings();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function updateExamPeriodSettings(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role?.toLowerCase())) {
      return res.status(403).json({
        error: 'Forbidden. Only Administrators can configure official examination dates.',
        code: 'UNAUTHORIZED_ROLE',
      });
    }
    const data = await examSchedulesService.updateExamPeriodSettings(req.body, req.user);
    res.json({ data });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code || 'VALIDATION_ERROR' });
    next(err);
  }
}

module.exports = {
  listExamSchedules,
  createExamSchedule,
  updateExamSchedule,
  deleteExamSchedule,
  getExamPeriodSettings,
  updateExamPeriodSettings,
};

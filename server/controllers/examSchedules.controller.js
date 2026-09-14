const { examSchedulesService } = require('../services/examSchedules.service');
const { logAction } = require('../services/systemLogs.service');

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

    await logAction({
      req,
      user: req.user,
      module: 'Exam Scheduling',
      action: 'Created Exam Schedule',
      description: `Created ${data.term || 'Midterm'} exam schedule for ${data.subject_code} on ${data.exam_date} (${data.start_time}-${data.end_time}, Room: ${data.room_number || 'TBD'}).`,
      targetId: data.id,
      targetType: 'ExamSchedule',
      status: 'Success',
      details: { subjectCode: data.subject_code, examDate: data.exam_date, room: data.room_number, proctor: data.proctor_name },
    });

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

    let action = 'Updated Exam Schedule';
    if (req.body?.proctor_id || req.body?.proctor_name || req.body?.room_number) {
      action = 'Assigned Exam Proctor/Room';
    }

    await logAction({
      req,
      user: req.user,
      module: 'Exam Scheduling',
      action,
      description: `Updated exam schedule #${req.params.id} (${data?.subject_code || ''}).`,
      targetId: req.params.id,
      targetType: 'ExamSchedule',
      status: 'Success',
      details: { proctor: data?.proctor_name, room: data?.room_number },
    });

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

    await logAction({
      req,
      user: req.user,
      module: 'Exam Scheduling',
      action: 'Deleted Exam Schedule',
      description: `Deleted exam schedule #${req.params.id}.`,
      targetId: req.params.id,
      targetType: 'ExamSchedule',
      status: 'Success',
    });

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

    await logAction({
      req,
      user: req.user,
      module: 'Exam Scheduling',
      action: 'Updated Official Exam Period Dates',
      description: 'Configured and updated institutional examination period calendar dates.',
      status: 'Success',
    });

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

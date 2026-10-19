const { schedulesService } = require('../services/schedules.service');
const { logAction } = require('../services/systemLogs.service');

async function listSchedules(req, res, next) {
  try {
    const rows = await schedulesService.listSchedules({
      user: req.user,
      department: req.query.department,
      facultyId: req.query.facultyId,
      program: req.query.program,
    });
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function generateSchedules(req, res, next) {
  try {
    if (!['admin', 'super_admin', 'program_head'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const rows = await schedulesService.generateSchedules({ user: req.user });

    await logAction({
      req,
      user: req.user,
      module: 'Class Scheduling',
      action: 'Generated Timetable Schedule Matrix',
      description: `Auto-generated timetable schedules matrix (${rows?.length || 0} entries created).`,
      status: 'Success',
      details: { count: rows?.length || 0 },
    });

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function createSchedule(req, res, next) {
  try {
    if (!['admin', 'super_admin', 'program_head'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators and Program Heads can create schedules.' });
    }
    const payload = req.body || {};
    const day = payload.day;
    const startTime = payload.start_time || (payload.time ? String(payload.time).split('-')[0].trim() : null);
    const subjectCode = payload.subject_code || payload.subjectCode;
    if (!day || !startTime || !subjectCode) {
      return res.status(400).json({ error: 'Day, time slot, and subject code are required' });
    }
    const row = await schedulesService.createSchedule(payload, req.user);

    await logAction({
      req,
      user: req.user,
      module: 'Class Scheduling',
      action: 'Created Class Schedule',
      description: `Created class schedule for ${subjectCode} on ${day} at ${startTime} (Room: ${payload.room_number || payload.room || 'TBD'}).`,
      targetId: row?.id,
      targetType: 'Schedule',
      status: 'Success',
      details: { subjectCode, day, startTime, room: payload.room_number || payload.room, faculty: payload.faculty_id || payload.instructorId },
    });

    res.status(201).json({ data: row });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code || 'VALIDATION_ERROR' });
    next(err);
  }
}

async function deleteSchedule(req, res, next) {
  try {
    if (!['admin', 'super_admin', 'program_head', 'dean'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators, Deans, and Program Heads can delete schedules.', code: 'UNAUTHORIZED_ROLE' });
    }
    const id = req.params.id;
    await schedulesService.deleteSchedule(id, req.user);

    await logAction({
      req,
      user: req.user,
      module: 'Class Scheduling',
      action: 'Deleted Class Schedule',
      description: `Deleted class schedule #${id}.`,
      targetId: id,
      targetType: 'Schedule',
      status: 'Success',
    });

    res.status(204).end();
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code || 'VALIDATION_ERROR' });
    next(err);
  }
}

async function bulkDeleteSchedules(req, res, next) {
  try {
    if (!['admin', 'super_admin', 'program_head', 'dean'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators, Deans, and Program Heads can delete schedules.', code: 'UNAUTHORIZED_ROLE' });
    }
    const ids = req.body?.ids || req.body?.scheduleIds;
    const result = await schedulesService.bulkDeleteSchedules(ids, req.user);

    await logAction({
      req,
      user: req.user,
      module: 'Class Scheduling',
      action: 'Bulk Deleted Class Schedules',
      description: `Bulk deleted ${result.deletedCount} class schedule(s) (#${(result.deletedIds || []).join(', #')}).`,
      targetId: (result.deletedIds || []).join(','),
      targetType: 'Schedule',
      status: 'Success',
      details: { deletedCount: result.deletedCount, deletedIds: result.deletedIds },
    });

    res.json({ data: result });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code || 'VALIDATION_ERROR' });
    next(err);
  }
}

async function updateSchedule(req, res, next) {
  try {
    if (!['admin', 'super_admin', 'program_head'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators and Program Heads can update schedules.', code: 'UNAUTHORIZED_ROLE' });
    }
    const id = req.params.id;
    const payload = req.body || {};
    const row = await schedulesService.updateSchedule(id, payload, req.user);

    await logAction({
      req,
      user: req.user,
      module: 'Class Scheduling',
      action: 'Updated Class Schedule',
      description: `Updated class schedule #${id}.`,
      targetId: id,
      targetType: 'Schedule',
      status: 'Success',
      details: { day: payload.day, time: payload.time || payload.start_time, room: payload.room_number || payload.room },
    });

    res.json({ data: row });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code || 'VALIDATION_ERROR' });
    next(err);
  }
}

async function listConflicts(req, res, next) {
  try {
    const rows = await schedulesService.detectConflicts({ user: req.user });
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function finalizeSchedule(req, res, next) {
  try {
    if (!['admin', 'super_admin', 'program_head', 'dsa'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators and Program Heads can finalize schedules.', code: 'UNAUTHORIZED_ROLE' });
    }
    const id = req.params.id;
    const result = await schedulesService.finalizeSchedule(id, req.user, req);
    res.json({ data: result });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code || 'VALIDATION_ERROR' });
    next(err);
  }
}

async function publishSchedule(req, res, next) {
  try {
    if (!['admin', 'super_admin', 'dsa'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Central Academic Administrators (Admin/DSA) can publish official schedules.', code: 'UNAUTHORIZED_ROLE' });
    }
    const id = req.params.id;
    const payload = req.body || {};
    const result = await schedulesService.publishSchedule(id, payload, req.user, req);
    res.json({ data: result });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code || 'VALIDATION_ERROR' });
    next(err);
  }
}

async function bulkUpdateScheduleStatus(req, res, next) {
  try {
    if (!['admin', 'super_admin', 'program_head', 'dsa'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators and Program Heads can manage schedule statuses.', code: 'UNAUTHORIZED_ROLE' });
    }
    const payload = req.body || {};
    const result = await schedulesService.bulkUpdateScheduleStatus(payload, req.user, req);
    res.json({ data: result });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code || 'VALIDATION_ERROR' });
    next(err);
  }
}

module.exports = {
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
};



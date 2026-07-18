const { schedulesService } = require('../services/schedules.service');

async function listSchedules(req, res, next) {
  try {
    const rows = await schedulesService.listSchedules({
      user: req.user,
      department: req.query.department,
    });
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function generateSchedules(req, res, next) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const rows = await schedulesService.generateSchedules();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function createSchedule(req, res, next) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const payload = req.body || {};
    if (!payload.day || !payload.start_time || !payload.subject_code) {
      return res.status(400).json({ error: 'day, start_time and subject_code are required' });
    }
    const row = await schedulesService.createSchedule(payload);
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
}

async function deleteSchedule(req, res, next) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const id = req.params.id;
    await schedulesService.deleteSchedule(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function updateSchedule(req, res, next) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const id = req.params.id;
    const payload = req.body || {};
    const row = await schedulesService.updateSchedule(id, payload);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

async function listConflicts(req, res, next) {
  try {
    const rows = await schedulesService.detectConflicts();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { listSchedules, generateSchedules, listConflicts, createSchedule, deleteSchedule, updateSchedule };


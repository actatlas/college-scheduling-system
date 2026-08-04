const { yearLevelsService } = require('../services/yearLevels.service');

async function listYearLevels(req, res, next) {
  try {
    if (!['admin', 'program_head'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const rows = await yearLevelsService.listYearLevels();
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
}

async function getYearLevelById(req, res, next) {
  try {
    if (!['admin', 'program_head'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const row = await yearLevelsService.getYearLevelById(req.params.id);
    return res.json({ data: row });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return next(err);
  }
}

async function createYearLevel(req, res, next) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const row = await yearLevelsService.createYearLevel(req.body || {});
    return res.status(201).json({ data: row });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return next(err);
  }
}

async function updateYearLevel(req, res, next) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const row = await yearLevelsService.updateYearLevel(req.params.id, req.body || {});
    return res.json({ data: row });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return next(err);
  }
}

async function deleteYearLevel(req, res, next) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await yearLevelsService.deleteYearLevel(req.params.id);
    return res.status(204).end();
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return next(err);
  }
}

module.exports = { listYearLevels, getYearLevelById, createYearLevel, updateYearLevel, deleteYearLevel };

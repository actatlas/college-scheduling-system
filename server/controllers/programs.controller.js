const { programsService } = require('../services/programs.service');

async function listPrograms(req, res, next) {
  try {
    const rows = await programsService.listPrograms();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function createProgram(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can create programs.', code: 'UNAUTHORIZED_ROLE' });
    }
    const payload = req.body || {};
    const row = await programsService.createProgram(payload);
    res.status(201).json({ data: row });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Program already exists' });
    }
    next(err);
  }
}

async function updateProgram(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can update programs.', code: 'UNAUTHORIZED_ROLE' });
    }
    const code = req.params.code;
    const payload = req.body || {};
    const row = await programsService.updateProgram(code, payload);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

async function deleteProgram(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can delete programs.', code: 'UNAUTHORIZED_ROLE' });
    }
    const code = req.params.code;
    await programsService.deleteProgram(code);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listPrograms, createProgram, updateProgram, deleteProgram };


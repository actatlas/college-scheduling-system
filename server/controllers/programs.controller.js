const { programsService } = require('../services/programs.service');
const { logAction } = require('../services/systemLogs.service');

async function listPrograms(req, res, next) {
  try {
    const rows = await programsService.listPrograms(req.user);
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

    await logAction({
      req,
      user: req.user,
      module: 'Academic Management',
      action: 'Created Program',
      description: `Created academic program ${row.name || row.code} (${row.code}).`,
      targetId: row.code,
      targetType: 'Program',
      status: 'Success',
    });

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

    await logAction({
      req,
      user: req.user,
      module: 'Academic Management',
      action: 'Updated Program',
      description: `Updated academic program ${code}.`,
      targetId: code,
      targetType: 'Program',
      status: 'Success',
    });

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

    await logAction({
      req,
      user: req.user,
      module: 'Academic Management',
      action: 'Deleted Program',
      description: `Deleted academic program ${code}.`,
      targetId: code,
      targetType: 'Program',
      status: 'Success',
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listPrograms, createProgram, updateProgram, deleteProgram };


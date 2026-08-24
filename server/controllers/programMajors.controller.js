const { programMajorsService } = require('../services/programMajors.service');

async function listProgramMajors(req, res, next) {
  try {
    if (!['admin', 'super_admin', 'program_head'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden', code: 'UNAUTHORIZED_ROLE' });
    }
    const rows = await programMajorsService.listProgramMajors();
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
}

async function getProgramMajorById(req, res, next) {
  try {
    if (!['admin', 'super_admin', 'program_head'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden', code: 'UNAUTHORIZED_ROLE' });
    }
    const row = await programMajorsService.getProgramMajorById(req.params.id);
    return res.json({ data: row });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return next(err);
  }
}

async function createProgramMajor(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can create program majors.', code: 'UNAUTHORIZED_ROLE' });
    }
    const row = await programMajorsService.createProgramMajor(req.body || {});
    return res.status(201).json({ data: row });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return next(err);
  }
}

async function updateProgramMajor(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can update program majors.', code: 'UNAUTHORIZED_ROLE' });
    }
    const row = await programMajorsService.updateProgramMajor(req.params.id, req.body || {});
    return res.json({ data: row });
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return next(err);
  }
}

async function deleteProgramMajor(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can delete program majors.', code: 'UNAUTHORIZED_ROLE' });
    }
    await programMajorsService.deleteProgramMajor(req.params.id);
    return res.status(204).end();
  } catch (err) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return next(err);
  }
}

module.exports = { listProgramMajors, getProgramMajorById, createProgramMajor, updateProgramMajor, deleteProgramMajor };

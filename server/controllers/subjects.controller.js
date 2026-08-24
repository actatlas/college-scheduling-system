const { subjectsService } = require('../services/subjects.service');

async function listSubjects(req, res, next) {
  try {
    const department = req.query.department;
    const rows = await subjectsService.listSubjects(department);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function createSubject(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can create subjects.', code: 'UNAUTHORIZED_ROLE' });
    }
    const payload = req.body || {};
    if (!payload.code || !payload.name) {
      return res.status(400).json({ error: 'Subject code and name are required' });
    }
    const row = await subjectsService.createSubject(payload);
    res.status(201).json({ data: row });
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || err.statusCode === 400)) {
      return res.status(400).json({ error: err.message || 'Subject code already exists' });
    }
    if (err && err.code === 'MISSING_FIELDS') {
      return res.status(400).json({ error: 'Subject code and name are required' });
    }
    next(err);
  }
}

async function deleteSubject(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can delete subjects.', code: 'UNAUTHORIZED_ROLE' });
    }
    const code = req.params.code;
    await subjectsService.deleteSubject(code);
    res.status(204).end();
  } catch (err) {
    if (err && (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451)) {
      return res.status(409).json({
        error: 'Cannot delete subject because it is currently assigned to class or examination schedules. Please remove or reassign those schedules first.',
        code: 'ACADEMIC_DEPENDENCY_RESTRICT'
      });
    }
    next(err);
  }
}

async function updateSubject(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can update subjects.', code: 'UNAUTHORIZED_ROLE' });
    }
    const code = req.params.code;
    const payload = req.body || {};
    const row = await subjectsService.updateSubject(code, payload);
    res.json({ data: row });
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || err.statusCode === 400)) {
      return res.status(400).json({ error: err.message || 'Failed to update subject' });
    }
    next(err);
  }
}

module.exports = { listSubjects, createSubject, deleteSubject, updateSubject };


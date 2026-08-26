const { subjectsService } = require('../services/subjects.service');
const { query } = require('../utils/db');

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
      return res.status(403).json({ error: 'Forbidden. Only Administrators can create subjects in the curriculum catalog.', code: 'UNAUTHORIZED_ROLE' });
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
        code: 'ACADEMIC_DEPENDENCY_RESTRICT',
      });
    }
    next(err);
  }
}

async function updateSubject(req, res, next) {
  try {
    const userRole = req.user?.role;
    if (!['admin', 'super_admin', 'program_head'].includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators and Program Heads can update subjects.', code: 'UNAUTHORIZED_ROLE' });
    }
    const code = req.params.code;
    const payload = req.body || {};

    if (userRole === 'program_head') {
      // Check that target subject is a Major subject belonging to the Program Head's assigned program
      const [subjectRow] = await query('SELECT code, name, program_code FROM subjects WHERE code = ? LIMIT 1', [code]);
      if (!subjectRow) {
        return res.status(404).json({ error: 'Subject not found' });
      }

      let allowedPrograms = [];
      if (req.user?.sub) {
        const majors = await query('SELECT program_code, code FROM program_majors WHERE program_head_id = ?', [req.user.sub]);
        for (const m of majors) {
          if (m.program_code) allowedPrograms.push(m.program_code);
          if (m.code) allowedPrograms.push(m.code);
        }
      }
      if (req.user?.program) allowedPrograms.push(req.user.program);
      if (req.user?.programCode) allowedPrograms.push(req.user.programCode);
      allowedPrograms = [...new Set(allowedPrograms.map((p) => String(p).toUpperCase()))];

      const subProg = String(subjectRow.program_code || '').toUpperCase();
      const isAllowedProgram = allowedPrograms.length === 0 || allowedPrograms.includes(subProg) || allowedPrograms.some((p) => subProg.includes(p));

      const isMinorOrShared = (
        (subjectRow.code && /^(GE|RS|PE|NSTP|GENED|CWTS|ROTC)/i.test(subjectRow.code)) ||
        (subjectRow.name && /general education|religious studies|physical education|national service/i.test(subjectRow.name)) ||
        payload.isMajor === false
      );

      if (!isAllowedProgram || isMinorOrShared) {
        return res.status(403).json({
          error: 'Forbidden. Program Heads can only manage Major Subjects within their assigned program. Minor and shared subjects are managed by Administrators.',
          code: 'UNAUTHORIZED_MAJOR_SUBJECT_ONLY',
        });
      }
    }

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

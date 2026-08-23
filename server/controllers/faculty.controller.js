const { facultyService } = require('../services/faculty.service');

async function listFaculty(req, res, next) {
  try {
    const rows = await facultyService.listFaculty();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

const { query } = require('../utils/db');

async function createFaculty(req, res, next) {
  try {
    if (!['admin', 'super_admin', 'program_head'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden', code: 'UNAUTHORIZED_ROLE' });
    }
    const payload = req.body || {};
    const row = await facultyService.createFaculty(payload);
    res.status(201).json({ data: row });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Faculty id already exists' });
    }
    next(err);
  }
}

async function updateFaculty(req, res, next) {
  try {
    let { id } = req.params;
    const payload = req.body || {};
    const userRole = req.user?.role;

    if (!['admin', 'super_admin', 'program_head'].includes(userRole)) {
      if (userRole !== 'teacher') {
        return res.status(403).json({ error: 'Forbidden', code: 'UNAUTHORIZED_ROLE' });
      }

      // Check if user is a teacher updating their own availability
      let teacherRow = null;
      if (req.user?.teacherId) {
        const [row] = await query('SELECT id, name, email, status FROM teachers WHERE id = ? LIMIT 1', [req.user.teacherId]);
        if (row) teacherRow = row;
      }
      if (!teacherRow && req.user?.email) {
        const [row] = await query('SELECT id, name, email, status FROM teachers WHERE LOWER(email) = LOWER(?) LIMIT 1', [req.user.email]);
        if (row) teacherRow = row;
      }
      if (!teacherRow && id) {
        const [row] = await query('SELECT id, name, email, status FROM teachers WHERE id = ? LIMIT 1', [id]);
        if (row && (!row.email || (req.user?.email && row.email.toLowerCase() === req.user.email.toLowerCase()))) {
          teacherRow = row;
        }
      }

      const teacherStatus = teacherRow?.status || req.user?.teacher?.status || 'Part-Time';

      if (teacherStatus === 'Full-Time') {
        return res.status(403).json({
          error: 'Full-time faculty cannot configure availability. Availability follows the standard institutional schedule.',
          code: 'FULL_TIME_FIXED_SCHEDULE',
        });
      }

      const invalidUpdate = Object.keys(payload).some((key) => key !== 'availability');
      if (invalidUpdate) {
        return res.status(403).json({ error: 'Forbidden. Teachers may only update their availability.', code: 'UNAUTHORIZED_ROLE' });
      }

      if (teacherRow) {
        id = teacherRow.id;
      } else if (!id || id === 'undefined' || id === 'null') {
        id = req.user?.teacherId || `FAC-${Date.now().toString().slice(-4)}`;
      }
    }

    const row = await facultyService.updateFaculty(id, {
      ...payload,
      email: payload.email || req.user?.email,
      name: payload.name || req.user?.name,
    });
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

async function deleteFaculty(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden', code: 'UNAUTHORIZED_ROLE' });
    }
    const { id } = req.params;
    await facultyService.deleteFaculty(id);
    res.json({ message: 'Faculty member deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listFaculty, createFaculty, updateFaculty, deleteFaculty };


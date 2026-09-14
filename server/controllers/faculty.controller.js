const { facultyService } = require('../services/faculty.service');
const { query } = require('../utils/db');
const { logAction } = require('../services/systemLogs.service');

async function listFaculty(req, res, next) {
  try {
    const rows = await facultyService.listFaculty(req.user);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function createFaculty(req, res, next) {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Forbidden. Only the Super Administrator can register faculty accounts.',
        code: 'UNAUTHORIZED_ROLE',
      });
    }
    const payload = req.body || {};
    const row = await facultyService.createFaculty(payload);

    await logAction({
      req,
      user: req.user,
      module: 'Faculty Management',
      action: 'Created Faculty Member',
      description: `Registered faculty profile for ${row.name} (${row.id}, ${row.status || 'Full-Time'}).`,
      targetId: row.id,
      targetType: 'Faculty',
      status: 'Success',
      details: { id: row.id, name: row.name, email: row.email, status: row.status },
    });

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

    if (userRole === 'admin') {
      // Admin cannot edit faculty profile fields (name, email, phone, department, status)
      const profileFields = ['name', 'email', 'phone', 'department', 'status'];
      const isEditingProfile = profileFields.some((field) => payload[field] !== undefined);
      if (isEditingProfile) {
        return res.status(403).json({
          error: 'Forbidden. Administrators cannot edit teacher profiles. Profile updates are managed by the user or Super Administrator.',
          code: 'UNAUTHORIZED_ROLE',
        });
      }
    } else if (userRole !== 'super_admin') {
      if (userRole !== 'teacher') {
        return res.status(403).json({
          error: 'Forbidden. Only Administrators can manage global faculty records. Program Heads manage major-subject scheduling assignments.',
          code: 'UNAUTHORIZED_ROLE',
        });
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

    const row = await facultyService.updateFaculty(id, payload);

    let action = 'Updated Faculty Member';
    let desc = `Updated faculty record #${id}.`;
    if (payload.availability) {
      action = 'Updated Teacher Availability';
      desc = `Updated weekly availability matrix for faculty #${id}.`;
    }

    await logAction({
      req,
      user: req.user,
      module: 'Faculty Management',
      action,
      description: desc,
      targetId: id,
      targetType: 'Faculty',
      status: 'Success',
    });

    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

async function deleteFaculty(req, res, next) {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Forbidden. Only the Super Administrator can delete faculty records.',
        code: 'UNAUTHORIZED_ROLE',
      });
    }
    const { id } = req.params;
    await facultyService.deleteFaculty(id);

    await logAction({
      req,
      user: req.user,
      module: 'Faculty Management',
      action: 'Deleted Faculty Member',
      description: `Deleted faculty record #${id}.`,
      targetId: id,
      targetType: 'Faculty',
      status: 'Success',
    });

    res.json({ message: 'Faculty member deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listFaculty, createFaculty, updateFaculty, deleteFaculty };

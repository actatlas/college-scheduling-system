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

    if (userRole !== 'super_admin') {
      return res.status(403).json({
        error: 'Forbidden. Only Super Administrators can edit teacher profiles.',
        code: 'UNAUTHORIZED_ROLE',
      });
    }

    const row = await facultyService.updateFaculty(id, payload);

    await logAction({
      req,
      user: req.user,
      module: 'Faculty Management',
      action: 'Updated Faculty Member',
      description: `Updated faculty record #${id}.`,
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

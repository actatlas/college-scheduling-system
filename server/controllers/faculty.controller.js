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

function canManageFaculty(user) {
  const role = String(user?.role || '').toLowerCase();
  return role === 'super_admin' || role === 'admin' || role === 'dean' || role === 'dsa';
}

async function createFaculty(req, res, next) {
  try {
    if (!canManageFaculty(req.user)) {
      return res.status(403).json({
        error: 'Forbidden. Only the Dean or Super Administrator can register faculty accounts.',
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

    if (!canManageFaculty(req.user)) {
      return res.status(403).json({
        error: 'Forbidden. Only the Dean or Super Administrator can edit teacher profiles.',
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
    if (!canManageFaculty(req.user)) {
      return res.status(403).json({
        error: 'Forbidden. Only the Dean or Administrator can delete faculty records.',
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

async function bulkDeleteFaculty(req, res, next) {
  try {
    if (!canManageFaculty(req.user)) {
      return res.status(403).json({
        error: 'Forbidden. Only the Dean or Administrator can delete faculty records.',
        code: 'UNAUTHORIZED_ROLE',
      });
    }
    const ids = Array.isArray(req.body.ids) ? req.body.ids : Array.isArray(req.body) ? req.body : [];
    if (ids.length === 0) {
      return res.status(400).json({ error: 'No faculty IDs provided for deletion.' });
    }

    const result = await facultyService.bulkDeleteFaculty(ids);

    await logAction({
      req,
      user: req.user,
      module: 'Faculty Management',
      action: 'Bulk Deleted Faculty Members',
      description: `Bulk deleted ${result.deletedCount} faculty member records.`,
      status: 'Success',
      details: { ids, count: result.deletedCount },
    });

    res.json({ message: `Successfully deleted ${result.deletedCount} faculty members.`, deletedCount: result.deletedCount });
  } catch (err) {
    next(err);
  }
}

async function bulkRemoveFaculty(req, res, next) {
  try {
    if (!canManageFaculty(req.user)) {
      return res.status(403).json({
        error: 'Forbidden. Only the Dean or Administrator can remove or deactivate faculty records.',
        code: 'UNAUTHORIZED_ROLE',
      });
    }
    const ids = Array.isArray(req.body.ids) ? req.body.ids : Array.isArray(req.body) ? req.body : [];
    const action = req.body.action || 'deactivate';
    if (ids.length === 0) {
      return res.status(400).json({ error: 'No faculty IDs provided for removal.' });
    }

    const result = await facultyService.bulkRemoveFaculty(ids, action);

    await logAction({
      req,
      user: req.user,
      module: 'Faculty Management',
      action: 'Bulk Removed/Deactivated Faculty Members',
      description: `Bulk removed/deactivated ${result.updatedCount} faculty members from active roster.`,
      status: 'Success',
      details: { ids, action, count: result.updatedCount },
    });

    res.json({ message: `Successfully removed ${result.updatedCount} faculty members from active roster.`, updatedCount: result.updatedCount });
  } catch (err) {
    next(err);
  }
}

module.exports = { listFaculty, createFaculty, updateFaculty, deleteFaculty, bulkDeleteFaculty, bulkRemoveFaculty };


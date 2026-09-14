const { usersService } = require('../services/users.service');
const { logAction } = require('../services/systemLogs.service');

async function listUsers(req, res, next) {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden. Only Super Administrator (ICT Office) can view user accounts.', code: 'UNAUTHORIZED_ROLE' });
    }
    const rows = await usersService.listUsers();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden. Only Super Administrator (ICT Office) can create user accounts.', code: 'UNAUTHORIZED_ROLE' });
    }
    const payload = req.body || {};
    if (!payload.name || !payload.email) {
      return res.status(400).json({ error: 'name and email are required' });
    }
    const row = await usersService.createUser(payload);

    let desc = `Created new ${row.role || 'user'} account for ${row.name} (${row.email}).`;
    if (row.role === 'program_head' && row.program) {
      desc = `Created new Program Head account for ${row.name} (${row.email}) assigned to ${row.program} Program.`;
    }

    await logAction({
      req,
      user: req.user,
      module: 'User Management',
      action: 'Created User Account',
      description: desc,
      targetId: row.id,
      targetType: 'User',
      status: 'Success',
      details: { role: row.role, program: row.program, email: row.email, name: row.name },
    });

    res.status(201).json({ data: row });
  } catch (err) {
    if (err.statusCode === 409 || err.statusCode === 400) {
      await logAction({
        req,
        user: req.user,
        module: 'User Management',
        action: 'Failed Create User',
        description: `Failed to create user ${req.body?.email || ''}: ${err.message}`,
        status: 'Failed',
      });
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden. Only Super Administrator (ICT Office) can update user accounts.', code: 'UNAUTHORIZED_ROLE' });
    }
    const { id } = req.params;
    const payload = req.body || {};

    // Block self-suspension
    if (payload.status === 'Suspended' && (String(req.user?.sub) === String(id) || String(req.user?.id) === String(id) || (payload.email && req.user?.email?.toLowerCase() === payload.email.toLowerCase()))) {
      return res.status(400).json({ error: 'You cannot suspend your own account.', code: 'SELF_SUSPENSION_FORBIDDEN' });
    }

    const row = await usersService.updateUser(id, payload);

    let actionName = 'Updated User Account';
    let desc = `Updated user account for ${row.name} (${row.email}).`;
    if (payload.status === 'Suspended') {
      actionName = 'Suspended User Account';
      desc = `Suspended user account for ${row.name} (${row.email}). Access blocked.`;
    } else if (payload.status === 'Active' && payload.previousStatus === 'Suspended') {
      actionName = 'Activated User Account';
      desc = `Activated user account for ${row.name} (${row.email}).`;
    } else if (row.role === 'program_head' && payload.program) {
      actionName = 'Assigned Program Head';
      desc = `Assigned ${row.name} as Program Head for ${payload.program}.`;
    }

    await logAction({
      req,
      user: req.user,
      module: 'User Management',
      action: actionName,
      description: desc,
      targetId: id,
      targetType: 'User',
      status: 'Success',
      details: { updatedFields: Object.keys(payload), status: row.status, role: row.role },
    });

    res.json({ data: row });
  } catch (err) {
    if (err.statusCode === 409 || err.statusCode === 400) {
      await logAction({
        req,
        user: req.user,
        module: 'User Management',
        action: 'Failed Update User',
        description: `Failed to update user #${req.params.id}: ${err.message}`,
        targetId: req.params.id,
        targetType: 'User',
        status: 'Failed',
      });
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden. Only Super Administrator (ICT Office) can delete user accounts.', code: 'UNAUTHORIZED_ROLE' });
    }
    const { id } = req.params;

    // Block self-deletion
    if (String(req.user?.sub) === String(id) || String(req.user?.id) === String(id)) {
      return res.status(400).json({ error: 'You cannot delete your own account.', code: 'SELF_DELETION_FORBIDDEN' });
    }

    await usersService.deleteUser(id);

    await logAction({
      req,
      user: req.user,
      module: 'User Management',
      action: 'Deleted User Account',
      description: `Permanently deleted user account #${id}.`,
      targetId: id,
      targetType: 'User',
      status: 'Success',
    });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, createUser, updateUser, deleteUser };


const { usersService } = require('../services/users.service');

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
    res.status(201).json({ data: row });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ error: err.message });
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
    res.json({ data: row });
  } catch (err) {
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
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, createUser, updateUser, deleteUser };


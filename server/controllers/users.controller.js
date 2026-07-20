const { usersService } = require('../services/users.service');

async function listUsers(req, res, next) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const rows = await usersService.listUsers();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    const payload = req.body || {};
    const row = await usersService.updateUser(id, payload);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    await usersService.deleteUser(id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, updateUser, deleteUser };


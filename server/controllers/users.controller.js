const { usersService } = require('../services/users.service');

async function listUsers(req, res, next) {
  try {
    const rows = await usersService.listUsers();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers };


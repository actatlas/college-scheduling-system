const { query } = require('../utils/db');

async function listUsers() {
  // Frontend user table isn't strongly typed in current project.
  // We'll return safe fields.
  const rows = await query(
    `SELECT id, name, email, role, created_at
     FROM users
     ORDER BY id DESC`
  );

  return rows.map((u) => ({
    id: String(u.id),
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.created_at,
  }));
}

const usersService = { listUsers };
module.exports = { usersService };


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

async function updateUser(id, { name, email, role }) {
  await query('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?', [name, email, role, id]);

  if (role === 'teacher') {
    const [existingTeacher] = await query('SELECT id FROM teachers WHERE email = ? LIMIT 1', [email]);
    if (!existingTeacher) {
      const teacherId = `T${Date.now().toString().slice(-6)}`;
      const [majorRow] = await query('SELECT id FROM program_majors WHERE code = ? LIMIT 1', ['BSIT']);
      await query(
        'INSERT INTO teachers (id, name, email, phone, status, program_major_id) VALUES (?, ?, ?, ?, ?, ?)',
        [teacherId, name, email, null, 'Full-Time', majorRow?.id || null]
      );
    }
  }

  return { id, name, email, role };
}

async function deleteUser(id) {
  const [user] = await query('SELECT email, role FROM users WHERE id = ? LIMIT 1', [id]);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  
  if (user.role === 'teacher') {
    await query('DELETE FROM teachers WHERE email = ?', [user.email]);
  }
  
  await query('DELETE FROM users WHERE id = ?', [id]);
}

const usersService = { listUsers, updateUser, deleteUser };
module.exports = { usersService };


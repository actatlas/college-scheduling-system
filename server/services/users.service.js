const bcrypt = require('bcrypt');
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

async function createUser({ name, email, role, password }) {
  const finalPassword = password && password.trim() ? password.trim() : '@srcb123';
  const passwordHash = await bcrypt.hash(finalPassword, 10);
  const [existing] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing) {
    const err = new Error('Email already in use');
    err.statusCode = 409;
    throw err;
  }
  const [result] = await query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email, passwordHash, role]);
  
  if (role === 'teacher') {
    const teacherId = `T${Date.now().toString().slice(-6)}`;
    const [majorRow] = await query('SELECT id FROM program_majors WHERE code = ? LIMIT 1', ['BSIT']);
    await query(
      'INSERT INTO teachers (id, name, email, phone, status, program_major_id) VALUES (?, ?, ?, ?, ?, ?)',
      [teacherId, name, email, null, 'Full-Time', majorRow?.id || null]
    );
  }
  return { id: String(result.insertId), name, email, role };
}

async function updateUser(id, { name, email, role, password }) {
  if (password && password.trim()) {
    const passwordHash = await bcrypt.hash(password.trim(), 10);
    await query('UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role), password_hash = ? WHERE id = ?', [
      name || null,
      email || null,
      role || null,
      passwordHash,
      id,
    ]);
  } else {
    await query('UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role) WHERE id = ?', [
      name || null,
      email || null,
      role || null,
      id,
    ]);
  }

  if (role === 'teacher' && email) {
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

const usersService = { listUsers, createUser, updateUser, deleteUser };
module.exports = { usersService };


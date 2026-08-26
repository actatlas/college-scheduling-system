const bcrypt = require('bcrypt');
const { query } = require('../utils/db');

async function listUsers() {
  const rows = await query(
    `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
            COALESCE(pm.code, pm.program_code) AS program,
            t.id AS teacher_id
     FROM users u
     LEFT JOIN program_majors pm ON pm.program_head_id = u.id
     LEFT JOIN teachers t ON LOWER(t.email) = LOWER(u.email)
     ORDER BY u.id DESC`
  );

  return rows.map((u) => ({
    id: String(u.id),
    name: u.name,
    email: u.email,
    role: u.role,
    program: u.program || undefined,
    teacherId: u.teacher_id ? String(u.teacher_id) : undefined,
    status: u.status || 'Active',
    createdAt: u.created_at,
  }));
}

async function createUser({ name, email, role, password, program, status }) {
  const finalPassword = password && password.trim() ? password.trim() : '@srcb123';
  const passwordHash = await bcrypt.hash(finalPassword, 10);
  const [existing] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing) {
    const err = new Error('Email already in use');
    err.statusCode = 409;
    throw err;
  }
  const accountStatus = status === 'Suspended' ? 'Suspended' : 'Active';
  const [result] = await query('INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)', [name, email, passwordHash, role, accountStatus]);
  const newId = (Array.isArray(result) ? result[0] : result)?.insertId || result.insertId || Date.now();
  
  if (role === 'program_head') {
    const targetProg = (program || 'BSIT').trim();
    const [majorRow] = await query('SELECT id FROM program_majors WHERE code = ? OR program_code = ? LIMIT 1', [targetProg, targetProg]);
    if (majorRow) {
      await query('UPDATE program_majors SET program_head_id = ? WHERE id = ?', [newId, majorRow.id]);
    }
  }

  if (role === 'teacher' || role === 'program_head') {
    const [existingTeacher] = await query('SELECT id FROM teachers WHERE email = ? LIMIT 1', [email]);
    if (!existingTeacher) {
      const teacherId = role === 'program_head' ? `FAC-HEAD-${Date.now().toString().slice(-4)}` : `T${Date.now().toString().slice(-6)}`;
      const targetProg = (program || 'BSIT').trim();
      const [majorRow] = await query('SELECT id FROM program_majors WHERE code = ? OR program_code = ? LIMIT 1', [targetProg, targetProg]);
      await query(
        'INSERT INTO teachers (id, name, email, phone, status, program_major_id) VALUES (?, ?, ?, ?, ?, ?)',
        [teacherId, name, email, null, 'Full-Time', majorRow?.id || null]
      );
    }
  }
  return { id: String(newId), name, email, role, program, status: accountStatus };
}

async function updateUser(id, { name, email, role, password, program, status }) {
  const normalizedStatus = status
    ? (String(status).trim().toLowerCase() === 'suspended' ? 'Suspended' : 'Active')
    : null;

  if (password && password.trim()) {
    const passwordHash = await bcrypt.hash(password.trim(), 10);
    await query(
      'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role), status = COALESCE(?, status), password_hash = ? WHERE id = ?',
      [name || null, email || null, role || null, normalizedStatus, passwordHash, id]
    );
  } else {
    await query(
      'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role), status = COALESCE(?, status) WHERE id = ?',
      [name || null, email || null, role || null, normalizedStatus, id]
    );
  }

  if (role === 'program_head') {
    await query('UPDATE program_majors SET program_head_id = NULL WHERE program_head_id = ?', [id]);
    const targetProg = (program || 'BSIT').trim();
    const [majorRow] = await query('SELECT id FROM program_majors WHERE code = ? OR program_code = ? LIMIT 1', [targetProg, targetProg]);
    if (majorRow) {
      await query('UPDATE program_majors SET program_head_id = ? WHERE id = ?', [id, majorRow.id]);
    }
  } else if (role && role !== 'program_head') {
    await query('UPDATE program_majors SET program_head_id = NULL WHERE program_head_id = ?', [id]);
  }

  if ((role === 'teacher' || role === 'program_head') && email) {
    const [existingTeacher] = await query('SELECT id FROM teachers WHERE email = ? LIMIT 1', [email]);
    const targetProg = (program || 'BSIT').trim();
    const [majorRow] = await query('SELECT id FROM program_majors WHERE code = ? OR program_code = ? LIMIT 1', [targetProg, targetProg]);
    if (!existingTeacher) {
      const teacherId = role === 'program_head' ? `FAC-HEAD-${Date.now().toString().slice(-4)}` : `T${Date.now().toString().slice(-6)}`;
      await query(
        'INSERT INTO teachers (id, name, email, phone, status, program_major_id) VALUES (?, ?, ?, ?, ?, ?)',
        [teacherId, name, email, null, 'Full-Time', majorRow?.id || null]
      );
    } else if (name) {
      await query('UPDATE teachers SET name = COALESCE(?, name), program_major_id = COALESCE(?, program_major_id) WHERE id = ?', [name, majorRow?.id || null, existingTeacher.id]);
    }
  }

  return { id, name, email, role, program, status };
}

async function deleteUser(id) {
  const [user] = await query('SELECT email, role FROM users WHERE id = ? LIMIT 1', [id]);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  
  if (user.role === 'program_head') {
    await query('UPDATE program_majors SET program_head_id = NULL WHERE program_head_id = ?', [id]);
  }

  if (user.role === 'teacher') {
    await query('DELETE FROM teachers WHERE email = ?', [user.email]);
  }
  
  await query('DELETE FROM users WHERE id = ?', [id]);
}

const usersService = { listUsers, createUser, updateUser, deleteUser };
module.exports = { usersService };

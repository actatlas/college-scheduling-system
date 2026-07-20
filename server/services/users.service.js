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
  
  if (role === 'student') {
    const [existingStudent] = await query('SELECT id FROM students WHERE user_id = ? LIMIT 1', [id]);
    if (!existingStudent) {
      const studentId = `STU${Date.now().toString().slice(-6)}`;
      await query(
        'INSERT INTO students (user_id, student_id, status) VALUES (?, ?, ?)',
        [id, studentId, 'active']
      );
    }
  } else if (role === 'teacher') {
    const [existingFaculty] = await query('SELECT id FROM faculty WHERE email = ? LIMIT 1', [email]);
    if (!existingFaculty) {
      const facultyId = `T${Date.now().toString().slice(-6)}`;
      await query(
        'INSERT INTO faculty (id, name, department, email, status) VALUES (?, ?, ?, ?, ?)',
        [facultyId, name, 'Academic Affairs', email, 'Full-Time']
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
    await query('DELETE FROM faculty WHERE email = ?', [user.email]);
  }
  
  await query('DELETE FROM users WHERE id = ?', [id]);
}

const usersService = { listUsers, updateUser, deleteUser };
module.exports = { usersService };


const { query } = require('../utils/db');
const bcrypt = require('bcrypt');

async function listStudents() {
  const rows = await query(
    `SELECT s.id, s.user_id, s.student_id, u.name, u.email, s.program_code, s.year_level, s.section_id, sec.section_label, s.status, s.created_at
     FROM students s
     INNER JOIN users u ON u.id = s.user_id
     LEFT JOIN sections sec ON sec.id = s.section_id
     ORDER BY s.id DESC`
  );

  return rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    studentId: r.student_id,
    name: r.name,
    email: r.email,
    programCode: r.program_code || '',
    yearLevel: r.year_level || '',
    sectionId: r.section_id ? String(r.section_id) : '',
    sectionLabel: r.section_label || '',
    status: r.status,
    createdAt: r.created_at,
  }));
}

async function createStudent({ name, email, password, studentId, programCode, yearLevel, sectionId, status }) {
  const hash = await bcrypt.hash(password || '@student123', 10);
  
  // Insert into users
  const [existingUser] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existingUser) {
    const err = new Error('Email already in use');
    err.statusCode = 409;
    throw err;
  }

  const userRes = await query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, hash, 'student']
  );
  
  const userId = userRes.insertId;
  const finalStudentId = studentId || `STU${Date.now().toString().slice(-6)}`;
  
  await query(
    `INSERT INTO students (user_id, student_id, program_code, year_level, section_id, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, finalStudentId, programCode || null, yearLevel || null, sectionId ? Number(sectionId) : null, status || 'active']
  );

  return { name, email, studentId: finalStudentId, programCode, yearLevel, sectionId, status };
}

async function updateStudent(id, { name, email, studentId, programCode, yearLevel, sectionId, status }) {
  const [student] = await query('SELECT user_id FROM students WHERE id = ? LIMIT 1', [id]);
  if (!student) {
    const err = new Error('Student not found');
    err.statusCode = 404;
    throw err;
  }

  const userId = student.user_id;

  // Update user name/email
  await query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, userId]);

  // Update student details
  await query(
    `UPDATE students 
     SET student_id = ?, program_code = ?, year_level = ?, section_id = ?, status = ?
     WHERE id = ?`,
    [studentId, programCode || null, yearLevel || null, sectionId ? Number(sectionId) : null, status || 'active', id]
  );

  return { id, name, email, studentId, programCode, yearLevel, sectionId, status };
}

async function deleteStudent(id) {
  const [student] = await query('SELECT user_id FROM students WHERE id = ? LIMIT 1', [id]);
  if (!student) {
    const err = new Error('Student not found');
    err.statusCode = 404;
    throw err;
  }
  
  // Deleting the user will cascade delete the student record
  await query('DELETE FROM users WHERE id = ?', [student.user_id]);
}

const studentsService = { listStudents, createStudent, updateStudent, deleteStudent };
module.exports = { studentsService };

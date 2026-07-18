const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../utils/db');

async function ensureDefaultUsers() {
  const defaultUsers = [
    { email: process.env.SEED_ADMIN_EMAIL || 'admin@srcb.edu.ph', password: process.env.SEED_ADMIN_PASSWORD || '@admin123', name: 'System Administrator', role: 'admin' },
    { email: process.env.SEED_TEACHER_EMAIL || 'teacher@srcb.edu.ph', password: process.env.SEED_TEACHER_PASSWORD || '@teacher123', name: 'Ms. Santos', role: 'teacher' },
    { email: process.env.SEED_STUDENT_EMAIL || 'student@srcb.edu.ph', password: process.env.SEED_STUDENT_PASSWORD || '@student123', name: 'Student User', role: 'student' },
  ];

  for (const user of defaultUsers) {
    const [existing] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [user.email]);
    if (existing) {
      if (user.role === 'teacher') {
        const [teacher] = await query('SELECT id FROM faculty WHERE email = ? LIMIT 1', [user.email]);
        if (!teacher) {
          await query('INSERT INTO faculty (id, name, department, email, status) VALUES (?, ?, ?, ?, ?)', [
            'T001',
            user.name,
            'Information Technology',
            user.email,
            'Full-Time',
          ]);
        }
      }
      if (user.role === 'student') {
        const [student] = await query('SELECT id FROM students WHERE user_id = ? LIMIT 1', [existing.id]);
        if (!student) {
          const [section] = await query('SELECT id FROM sections WHERE course_code = ? AND section_label = ? LIMIT 1', ['BSCS', 'A']);
          await query(
            'INSERT INTO students (user_id, student_id, program_code, year_level, section_id, status) VALUES (?, ?, ?, ?, ?, ?)',
            [existing.id, 'STU000001', 'BSCS', '1', section?.id || null, 'active'],
          );
        }
      }
      continue;
    }
    const passwordHash = await bcrypt.hash(user.password, 10);
    const [result] = await query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [user.name, user.email, passwordHash, user.role]);

    if (user.role === 'teacher') {
      await query('INSERT INTO faculty (id, name, department, email, status) VALUES (?, ?, ?, ?, ?)', [
        'T001',
        user.name,
        'Information Technology',
        user.email,
        'Full-Time',
      ]);
    }

    if (user.role === 'student') {
      const [section] = await query('SELECT id FROM sections WHERE course_code = ? AND section_label = ? LIMIT 1', ['BSCS', 'A']);
      await query(
        'INSERT INTO students (user_id, student_id, program_code, year_level, section_id, status) VALUES (?, ?, ?, ?, ?, ?)',
        [result.insertId, 'STU000001', 'BSCS', '1', section?.id || null, 'active'],
      );
    }
  }
}

async function register({ name, email, password, role, programCode, yearLevel }) {
  const passwordHash = await bcrypt.hash(password, 10);

  const [existing] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing) {
    const err = new Error('Email already in use');
    err.statusCode = 409;
    throw err;
  }

  const [result] = await query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, passwordHash, role || 'admin']
  );

  if ((role || 'admin') === 'student') {
    const studentId = `STU${Date.now().toString().slice(-6)}`;
    await query(
      'INSERT INTO students (user_id, student_id, program_code, year_level, status) VALUES (?, ?, ?, ?, ?)',
      [result.insertId, studentId, programCode || null, yearLevel || null, 'active']
    );
  }

  if ((role || 'admin') === 'teacher') {
    const facultyId = `T${Date.now().toString().slice(-6)}`;
    await query(
      'INSERT INTO faculty (id, name, department, email, status) VALUES (?, ?, ?, ?, ?)',
      [facultyId, name, 'Academic Affairs', email, 'Full-Time'],
    );
  }

  return { message: 'User registered successfully' };
}

async function login({ email, password }) {
  const rows = await query(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1',
    [email]
  );

  const user = rows[0];
  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
  const token = jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  if (user.role === 'student') {
    const [student] = await query(
      'SELECT s.student_id, s.program_code, s.year_level, s.section_id, sec.section_label, sec.course_code FROM students s LEFT JOIN sections sec ON sec.id = s.section_id WHERE s.user_id = ? LIMIT 1',
      [user.id]
    );
    if (student) {
      payload.student = {
        studentId: student.student_id,
        programCode: student.program_code,
        yearLevel: student.year_level,
        sectionId: student.section_id,
        sectionLabel: student.section_label,
        courseCode: student.course_code,
      };
    }
  }

  if (user.role === 'teacher') {
    const [facultyMember] = await query(
      'SELECT id, department, status, availability FROM faculty WHERE email = ? LIMIT 1',
      [user.email]
    );
    if (facultyMember) {
      payload.teacher = {
        id: facultyMember.id,
        department: facultyMember.department,
        status: facultyMember.status,
        availability: facultyMember.availability,
      };
    }
  }

  return {
    token,
    user: payload,
  };
}

async function getCurrentUser({ sub }) {
  const rows = await query(
    'SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1',
    [sub]
  );

  const user = rows[0];
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  if (user.role === 'student') {
    const [student] = await query(
      'SELECT s.student_id, s.program_code, s.year_level, s.section_id, sec.section_label, sec.course_code FROM students s LEFT JOIN sections sec ON sec.id = s.section_id WHERE s.user_id = ? LIMIT 1',
      [user.id]
    );
    if (student) {
      payload.student = {
        studentId: student.student_id,
        programCode: student.program_code,
        yearLevel: student.year_level,
        sectionId: student.section_id,
        sectionLabel: student.section_label,
        courseCode: student.course_code,
      };
    }
  }

  if (user.role === 'teacher') {
    const [facultyMember] = await query(
      'SELECT id, department, status, availability FROM faculty WHERE email = ? LIMIT 1',
      [user.email]
    );
    if (facultyMember) {
      payload.teacher = {
        id: facultyMember.id,
        department: facultyMember.department,
        status: facultyMember.status,
        availability: facultyMember.availability,
      };
    }
  }

  return { user: payload };
}

const authService = { register, login, getCurrentUser, ensureDefaultUsers };
module.exports = { authService };
const crypto = require('crypto');
const { pool } = require('../database/pool');

async function createResetToken(email) {
  const rows = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  const user = rows[0];
  if (!user) {
    const err = new Error('No user with that email');
    err.statusCode = 404;
    throw err;
  }
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
  await query('INSERT INTO reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, token, expiresAt]);
  return { token, expiresAt };
}

async function resetPassword(token, newPassword) {
  const rows = await query('SELECT user_id, expires_at FROM reset_tokens WHERE token = ? LIMIT 1', [token]);
  const row = rows[0];
  if (!row) {
    const err = new Error('Invalid token');
    err.statusCode = 400;
    throw err;
  }
  const expires = new Date(row.expires_at);
  if (expires < new Date()) {
    const err = new Error('Token expired');
    err.statusCode = 400;
    throw err;
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, row.user_id]);
  await query('DELETE FROM reset_tokens WHERE token = ?', [token]);
  return { message: 'Password reset' };
}

authService.createResetToken = createResetToken;
authService.resetPassword = resetPassword;


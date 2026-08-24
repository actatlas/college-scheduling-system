const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../utils/db');

const DEFAULT_ADMIN_EMAIL = 'admin@srcb.edu.ph';
const DEFAULT_ADMIN_PASSWORD = '@admin123';
const DEFAULT_ADMIN_NAME = 'System Administrator';

async function ensureCatalogSeed() {
  try {
    await query("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'admin', 'teacher', 'program_head') NOT NULL DEFAULT 'admin'");
  } catch (err) {
    // ignore if already aligned or unsupported in mock
  }

  const [program] = await query('SELECT code FROM programs WHERE code = ? LIMIT 1', ['ITP']);
  if (!program) {
    await query('INSERT INTO programs (code, name, focus) VALUES (?, ?, ?)', ['ITP', 'Information Technology Program', 'ITP']);
  }

  const [semester] = await query('SELECT id FROM semesters WHERE name = ? LIMIT 1', ['1st Semester']);
  if (!semester) {
    await query('INSERT INTO semesters (name, is_active) VALUES (?, ?)', ['1st Semester', true]);
  }

  const [academicYear] = await query('SELECT id FROM academic_years WHERE name = ? LIMIT 1', ['2026-2027']);
  if (!academicYear) {
    await query('INSERT INTO academic_years (name, is_active) VALUES (?, ?)', ['2026-2027', true]);
  }

  const [course] = await query('SELECT code FROM courses WHERE code = ? LIMIT 1', ['BSCS']);
  if (!course) {
    await query('INSERT INTO courses (code, name, program_code, year_duration) VALUES (?, ?, ?, ?)', ['BSCS', 'Bachelor of Science in Computer Science', 'ITP', 4]);
  }

  const [section] = await query('SELECT id FROM sections WHERE course_code = ? AND section_label = ? LIMIT 1', ['BSCS', 'A']);
  if (!section) {
    const [semesterRow] = await query('SELECT id FROM semesters WHERE name = ? LIMIT 1', ['1st Semester']);
    const [yearRow] = await query('SELECT id FROM academic_years WHERE name = ? LIMIT 1', ['2026-2027']);
    await query(
      'INSERT INTO sections (course_code, year_level, section_label, adviser_id, students, semester_id, academic_year_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['BSCS', 1, 'A', null, 30, semesterRow?.id || 1, yearRow?.id || 1]
    );
  }
}

async function ensureDefaultUsers() {
  await ensureCatalogSeed();
  const defaultUsers = [
    { email: process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@srcb.edu.ph', password: process.env.SEED_SUPERADMIN_PASSWORD || '@superadmin123', name: 'ICT Super Administrator', role: 'super_admin' },
    { email: process.env.SEED_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD, name: DEFAULT_ADMIN_NAME, role: 'admin' },
    { email: 'programhead@srcb.edu.ph', password: '@program123', name: 'Dr. Reyes (IT Head)', role: 'program_head' },
    { email: process.env.SEED_TEACHER_EMAIL || 'teacher@srcb.edu.ph', password: process.env.SEED_TEACHER_PASSWORD || '@teacher123', name: 'Maria Santos', role: 'teacher', teacherStatus: 'Full-Time', teacherId: 'T001' },
    { email: 'parttime@srcb.edu.ph', password: '@teacher123', name: 'Marco Sabuero', role: 'teacher', teacherStatus: 'Part-Time', teacherId: 'FAC-003' },
  ];

  for (const user of defaultUsers) {
    const [existing] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [user.email]);
    let userId;

    if (existing) {
      userId = existing.id;
      const passwordHash = await bcrypt.hash(user.password, 10);
      await query('UPDATE users SET name = ?, role = ?, password_hash = ? WHERE id = ?', [user.name, user.role, passwordHash, userId]);
    } else {
      const passwordHash = await bcrypt.hash(user.password, 10);
      const [result] = await query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [user.name, user.email, passwordHash, user.role]);
      userId = (Array.isArray(result) ? result[0] : result)?.insertId || result.insertId;
    }

    if (user.role === 'program_head') {
      const [major] = await query('SELECT id FROM program_majors WHERE code = ? LIMIT 1', ['BSIT']);
      if (major) {
        await query('UPDATE program_majors SET program_head_id = ? WHERE id = ?', [userId, major.id]);
      }
    }

    if (user.role === 'teacher') {
      const teacherId = user.teacherId || (user.teacherStatus === 'Part-Time' ? 'FAC-003' : 'T001');
      const teacherStatus = user.teacherStatus || 'Full-Time';
      const [major] = await query('SELECT id FROM program_majors WHERE code = ? LIMIT 1', ['BSIT']);
      const [teacher] = await query('SELECT id FROM teachers WHERE id = ? OR LOWER(email) = LOWER(?) LIMIT 1', [teacherId, user.email]);

      if (!teacher) {
        await query('INSERT INTO teachers (id, name, email, phone, status, program_major_id) VALUES (?, ?, ?, ?, ?, ?)', [
          teacherId,
          user.name,
          user.email,
          '123-456',
          teacherStatus,
          major?.id || null,
        ]);
      } else {
        await query('UPDATE teachers SET name = ?, status = ?, email = COALESCE(email, ?) WHERE id = ?', [user.name, teacherStatus, user.email, teacher.id]);
      }
    }
  }
}

async function register({ name, email, password, role }) {
  await ensureCatalogSeed();

  const safeRole = role === 'program_head' || role === 'teacher' ? role : 'admin';
  const passwordHash = await bcrypt.hash(password, 10);

  const [existing] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing) {
    const err = new Error('Email already in use');
    err.statusCode = 409;
    throw err;
  }

  const [result] = await query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, passwordHash, safeRole]
  );
  const userId = (Array.isArray(result) ? result[0] : result)?.insertId || result.insertId;

  if (safeRole === 'teacher') {
    const facultyId = `T${Date.now().toString().slice(-6)}`;
    const [major] = await query('SELECT id FROM program_majors WHERE code = ? LIMIT 1', ['BSIT']);
    await query(
      'INSERT INTO teachers (id, name, email, phone, status, program_major_id) VALUES (?, ?, ?, ?, ?, ?)',
      [facultyId, name, email, null, 'Full-Time', major?.id || null],
    );
  } else if (safeRole === 'program_head') {
    const [major] = await query('SELECT id FROM program_majors WHERE code = ? LIMIT 1', ['BSIT']);
    if (major) {
      await query('UPDATE program_majors SET program_head_id = ? WHERE id = ?', [userId, major.id]);
    }
  }

  return { message: 'User registered successfully' };
}

async function login({ email, password }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const normalizedPassword = (password || '').trim();

  if (!normalizedEmail || !normalizedPassword) {
    const err = new Error('Please enter your email and password');
    err.statusCode = 400;
    throw err;
  }

  const rows = await query(
    'SELECT id, name, email, password_hash, role FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1',
    [normalizedEmail]
  );

  let user = rows[0];
  if (!user && normalizedEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() && normalizedPassword === DEFAULT_ADMIN_PASSWORD) {
    user = {
      id: 1,
      name: DEFAULT_ADMIN_NAME,
      email: DEFAULT_ADMIN_EMAIL,
      role: 'admin',
    };
  } else if (!user || !user.password_hash) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  } else {
    const ok = await bcrypt.compare(normalizedPassword, user.password_hash);
    if (!ok) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }
  }

  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  if (user.role === 'teacher') {
    let [teacher] = await query(
      'SELECT id, name, email, phone, status FROM teachers WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [user.email]
    );
    if (!teacher && user.name) {
      [teacher] = await query(
        'SELECT id, name, email, phone, status FROM teachers WHERE LOWER(name) = LOWER(?) LIMIT 1',
        [user.name]
      );
    }
    if (teacher) {
      payload.teacher = {
        id: String(teacher.id),
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        status: teacher.status,
      };
      payload.teacherId = String(teacher.id);
    }
  } else if (user.role === 'program_head') {
    const majors = await query(
      'SELECT pm.id, pm.code, pm.name, pm.program_code FROM program_majors pm WHERE pm.program_head_id = ?',
      [user.id]
    );
    if (majors && majors.length > 0) {
      payload.program = majors[0].code || majors[0].program_code;
      payload.programCode = majors[0].program_code;
      payload.programs = majors.map((m) => m.code);
    } else {
      payload.program = 'BSIT';
      payload.programCode = 'ITP';
      payload.programs = ['BSIT'];
    }
  }

  const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      teacherId: payload.teacherId || null,
      program: payload.program || null,
      programCode: payload.programCode || null,
    },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

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

  if (user.role === 'teacher') {
    let [teacher] = await query(
      'SELECT id, name, email, phone, status FROM teachers WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [user.email]
    );
    if (!teacher && user.name) {
      [teacher] = await query(
        'SELECT id, name, email, phone, status FROM teachers WHERE LOWER(name) = LOWER(?) LIMIT 1',
        [user.name]
      );
    }
    if (teacher) {
      payload.teacher = {
        id: String(teacher.id),
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        status: teacher.status,
      };
      payload.teacherId = String(teacher.id);
    }
  } else if (user.role === 'program_head') {
    const majors = await query(
      'SELECT pm.id, pm.code, pm.name, pm.program_code FROM program_majors pm WHERE pm.program_head_id = ?',
      [user.id]
    );
    if (majors && majors.length > 0) {
      payload.program = majors[0].code || majors[0].program_code;
      payload.programCode = majors[0].program_code;
      payload.programs = majors.map((m) => m.code);
    } else {
      payload.program = 'BSIT';
      payload.programCode = 'ITP';
      payload.programs = ['BSIT'];
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


const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../utils/db');

const DEFAULT_ADMIN_EMAIL = 'admin@srcb.edu.ph';
const DEFAULT_ADMIN_PASSWORD = '@admin123';
const DEFAULT_ADMIN_NAME = 'System Administrator';

async function ensureCatalogSeed() {
  try {
    await query("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'admin', 'program_head') NOT NULL DEFAULT 'admin'");
  } catch (err) {
    // ignore if already aligned or unsupported in mock
  }

  try {
    await query("ALTER TABLE users ADD COLUMN status ENUM('Active', 'Suspended') NOT NULL DEFAULT 'Active'");
  } catch (err) {
    try {
      await query("ALTER TABLE users MODIFY COLUMN status ENUM('Active', 'Suspended') NOT NULL DEFAULT 'Active'");
    } catch (e) {
      // ignore if already aligned or unsupported in mock
    }
  }

  try {
    await query("ALTER TABLE users ADD COLUMN program VARCHAR(50) DEFAULT NULL");
  } catch (err) {
    // ignore if already exists or unsupported
  }

  try {
    await query("UPDATE courses SET program_code = 'BAP' WHERE program_code = 'BSA'");
    await query("UPDATE subjects SET program_code = 'BAP' WHERE program_code = 'BSA'");
    await query("UPDATE program_majors SET program_code = 'BAP' WHERE program_code = 'BSA'");
    await query("UPDATE users SET program = 'BAP' WHERE program = 'BSA'");
    await query("DELETE FROM programs WHERE code = 'BSA'");
  } catch (e) {
    // ignore if table structure or constraint doesn't exist
  }

  const standardPrograms = [
    ['BAP', 'Business Administration Program', 'BAP Focus'],
    ['ITP', 'Information Technology Program', 'ITP Focus'],
    ['CJEP', 'Criminal Justice Education Program', 'CJEP Focus'],
    ['TEP', 'Teacher Education Program', 'TEP Focus'],
    ['HMP', 'Hospitality Management Program', 'HMP Focus'],
  ];
  for (const [pCode, pName, pFocus] of standardPrograms) {
    const [existingProg] = await query('SELECT code FROM programs WHERE code = ? LIMIT 1', [pCode]);
    if (!existingProg) {
      await query('INSERT INTO programs (code, name, focus) VALUES (?, ?, ?)', [pCode, pName, pFocus]);
    }
  }

  const [semester] = await query('SELECT id FROM semesters WHERE name = ? LIMIT 1', ['1st Semester']);
  if (!semester) {
    await query('INSERT INTO semesters (name, is_active) VALUES (?, ?)', ['1st Semester', true]);
  }

  const [academicYear] = await query('SELECT id FROM academic_years WHERE name = ? LIMIT 1', ['2026-2027']);
  if (!academicYear) {
    await query('INSERT INTO academic_years (name, is_active) VALUES (?, ?)', ['2026-2027', true]);
  }

}

async function ensureDefaultUsers() {
  await ensureCatalogSeed();
  const defaultUsers = [
    { email: process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@srcb.edu.ph', password: process.env.SEED_SUPERADMIN_PASSWORD || '@superadmin123', name: 'ICT Super Administrator', role: 'super_admin' },
    { email: process.env.SEED_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD, name: DEFAULT_ADMIN_NAME, role: 'admin' },
    // TEP Program Head (Legitimate active program)
    { email: 'educhead@srcb.edu.ph', password: '@program123', name: 'Dr. Maria Montessori', role: 'program_head', program: 'TEP', majorCode: 'BSED' },
  ];

  // Purge legacy part-time faculty accounts so only official faculty accounts exist
  try {
    await query("DELETE FROM users WHERE email IN ('parttime@srcb.edu.ph', 'faculty.parttime@srcb.edu.ph', 'liezel@srcb.edu.ph')");
  } catch (err) {
    // ignore if table doesn't exist
  }

  for (const user of defaultUsers) {
    const [existing] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [user.email]);
    let userId;

    if (existing) {
      userId = existing.id;
      const passwordHash = await bcrypt.hash(user.password, 10);
      try {
        await query('UPDATE users SET name = ?, role = ?, password_hash = ?, status = "Active", program = ? WHERE id = ?', [user.name, user.role, passwordHash, user.program || null, userId]);
      } catch (e) {
        await query('UPDATE users SET name = ?, role = ?, password_hash = ?, status = "Active" WHERE id = ?', [user.name, user.role, passwordHash, userId]);
      }
    } else {
      const passwordHash = await bcrypt.hash(user.password, 10);
      try {
        const [result] = await query('INSERT INTO users (name, email, password_hash, role, status, program) VALUES (?, ?, ?, ?, "Active", ?)', [user.name, user.email, passwordHash, user.role, user.program || null]);
        userId = (Array.isArray(result) ? result[0] : result)?.insertId || result.insertId;
      } catch (e) {
        const [result] = await query('INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, "Active")', [user.name, user.email, passwordHash, user.role]);
        userId = (Array.isArray(result) ? result[0] : result)?.insertId || result.insertId;
      }
    }

    if (user.role === 'program_head' && user.majorCode) {
      const [major] = await query('SELECT id FROM program_majors WHERE code = ? LIMIT 1', [user.majorCode]);
      if (major) {
        await query('UPDATE program_majors SET program_head_id = ? WHERE id = ?', [userId, major.id]);
      }
    }

    if (user.role === 'teacher') {
      const teacherId = user.teacherId || `T${Date.now().toString().slice(-6)}`;
      const teacherStatus = user.teacherStatus || 'Full-Time';
      const [major] = user.majorCode ? await query('SELECT id FROM program_majors WHERE code = ? LIMIT 1', [user.majorCode]) : [null];
      const [teacher] = await query('SELECT id FROM teachers WHERE id = ? OR LOWER(email) = LOWER(?) LIMIT 1', [teacherId, user.email]);

      if (!teacher) {
        await query('INSERT INTO teachers (id, name, email, phone, status, program_major_id) VALUES (?, ?, ?, ?, ?, ?)', [
          teacherId,
          user.name,
          user.email,
          '0917-000-0000',
          teacherStatus,
          major?.id || null,
        ]);
      } else {
        await query('UPDATE teachers SET name = ?, status = ?, email = COALESCE(email, ?), program_major_id = COALESCE(?, program_major_id) WHERE id = ?', [user.name, teacherStatus, user.email, major?.id || null, teacher.id]);
      }
    }
  }
}

async function register({ name, email, password, role }) {
  await ensureCatalogSeed();

  if (role === 'teacher' || role === 'student') {
    const err = new Error(`${role === 'student' ? 'Student' : 'Teacher'} is not a valid system user role. Only Super Admin, Admin, and Program Head roles are supported.`);
    err.statusCode = 400;
    err.code = `${role.toUpperCase()}_ROLE_NOT_SUPPORTED`;
    throw err;
  }

  const safeRole = role === 'program_head' || role === 'super_admin' ? role : 'admin';
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

  if (safeRole === 'program_head') {
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
    'SELECT id, name, email, password_hash, role, status FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1',
    [normalizedEmail]
  );

  let user = rows[0];
  if (!user && normalizedEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() && normalizedPassword === DEFAULT_ADMIN_PASSWORD) {
    user = {
      id: 1,
      name: DEFAULT_ADMIN_NAME,
      email: DEFAULT_ADMIN_EMAIL,
      role: 'admin',
      status: 'Active',
    };
  } else if (!user || !user.password_hash) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  } else {
    // Check if account is suspended BEFORE password comparison or authentication approval
    const isSuspended = String(user.status || '').trim().toLowerCase() === 'suspended';
    if (isSuspended) {
      const err = new Error('Your account has been suspended. Please contact the ICT Office or system administrator.');
      err.statusCode = 403;
      err.code = 'ACCOUNT_SUSPENDED';
      throw err;
    }

    // Check if role is obsolete teacher or student role
    if (String(user.role || '').toLowerCase() === 'teacher') {
      const err = new Error('Faculty accounts do not have direct system login. Finalized and updated schedules are communicated directly through your official school email.');
      err.statusCode = 403;
      err.code = 'TEACHER_LOGIN_DISABLED';
      throw err;
    }
    if (String(user.role || '').toLowerCase() === 'student') {
      const err = new Error('Student is not an authorized system role. The SCSMS is strictly for authorized academic personnel (Super Admin, Admin, Program Head).');
      err.statusCode = 403;
      err.code = 'STUDENT_LOGIN_DISABLED';
      throw err;
    }

    const ok = await bcrypt.compare(normalizedPassword, user.password_hash);
    if (!ok) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }
  }

  const isSuspended = String(user.status || '').trim().toLowerCase() === 'suspended';
  if (isSuspended) {
    const err = new Error('Your account has been suspended. Please contact the ICT Office or system administrator.');
    err.statusCode = 403;
    err.code = 'ACCOUNT_SUSPENDED';
    throw err;
  }

  if (String(user.role || '').toLowerCase() === 'teacher') {
    const err = new Error('Faculty accounts do not have direct system login. Finalized and updated schedules are communicated directly through your official school email.');
    err.statusCode = 403;
    err.code = 'TEACHER_LOGIN_DISABLED';
    throw err;
  }
  if (String(user.role || '').toLowerCase() === 'student') {
    const err = new Error('Student is not an authorized system role. The SCSMS is strictly for authorized academic personnel (Super Admin, Admin, Program Head).');
    err.statusCode = 403;
    err.code = 'STUDENT_LOGIN_DISABLED';
    throw err;
  }

  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status || 'Active',
  };

  if (user.role === 'teacher' || user.role === 'program_head') {
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
  }

  if (user.role === 'program_head') {
    const majors = await query(
      'SELECT pm.id, pm.code, pm.name, pm.program_code FROM program_majors pm WHERE pm.program_head_id = ?',
      [user.id]
    );
    if (majors && majors.length > 0) {
      payload.program = user.program || majors[0].code || majors[0].program_code;
      payload.programCode = user.program || majors[0].program_code;
      payload.programs = majors.map((m) => m.code);
    } else {
      payload.program = user.program || 'ITP';
      payload.programCode = user.program || 'ITP';
      payload.programs = [user.program || 'ITP'];
    }
  }

  const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
  const token = jwt.sign(
    {
      sub: user.id,
      id: user.id,
      role: user.role,
      email: user.email,
      status: user.status || 'Active',
      teacherId: payload.teacherId || (user.role === 'program_head' ? 'FAC-003' : null),
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

async function getCurrentUser({ sub, id }) {
  const targetId = sub || id;
  const rows = await query(
    'SELECT id, name, email, role, status FROM users WHERE id = ? LIMIT 1',
    [targetId]
  );

  const user = rows[0];
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const isSuspended = String(user.status || '').trim().toLowerCase() === 'suspended';
  if (isSuspended) {
    const err = new Error('Your account has been suspended. Please contact the ICT Office or system administrator.');
    err.statusCode = 403;
    err.code = 'ACCOUNT_SUSPENDED';
    throw err;
  }

  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status || 'Active',
  };

  if (user.role === 'teacher' || user.role === 'program_head') {
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
  }

  if (user.role === 'program_head') {
    const majors = await query(
      'SELECT pm.id, pm.code, pm.name, pm.program_code FROM program_majors pm WHERE pm.program_head_id = ?',
      [user.id]
    );
    if (majors && majors.length > 0) {
      payload.program = user.program || majors[0].code || majors[0].program_code;
      payload.programCode = user.program || majors[0].program_code;
      payload.programs = majors.map((m) => m.code);
    } else {
      payload.program = user.program || 'ITP';
      payload.programCode = user.program || 'ITP';
      payload.programs = [user.program || 'ITP'];
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

async function changePassword(userId, currentPassword, newPassword) {
  const [user] = await query('SELECT id, password_hash FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!user) {
    const err = new Error('User account not found');
    err.statusCode = 404;
    throw err;
  }
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    const err = new Error('Incorrect current password');
    err.statusCode = 400;
    throw err;
  }
  const newHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
  return { success: true, message: 'Password changed successfully' };
}

async function updateProfile(userId, { name, phone }) {
  const [user] = await query('SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!user) {
    const err = new Error('User account not found');
    err.statusCode = 404;
    throw err;
  }
  if (name && name.trim()) {
    await query('UPDATE users SET name = ? WHERE id = ?', [name.trim(), userId]);
    await query('UPDATE teachers SET name = ? WHERE LOWER(email) = LOWER(?)', [name.trim(), user.email]);
  }
  if (phone !== undefined) {
    await query('UPDATE teachers SET phone = ? WHERE LOWER(email) = LOWER(?)', [phone ? phone.trim() : null, user.email]);
  }
  return { success: true, message: 'Profile updated successfully', name: name ? name.trim() : user.name };
}

authService.createResetToken = createResetToken;
authService.resetPassword = resetPassword;
authService.changePassword = changePassword;
authService.updateProfile = updateProfile;



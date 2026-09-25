const bcrypt = require('bcrypt');
const { query } = require('../utils/db');

function getProgramFamily(progStr) {
  if (!progStr) return '';
  const s = String(progStr).toUpperCase().trim();
  if (['ALL', 'GEN', 'GENED', 'GENERAL EDUCATION', 'UNIVERSAL'].includes(s)) return 'GENED';

  const IT_KEYS = ['ITP', 'BSIT', 'BSCS', 'INFORMATION TECHNOLOGY', 'COMPUTER SCIENCE'];
  const CRIM_KEYS = ['CJEP', 'BSCRIM', 'CRIMINOLOGY', 'CRIMINAL JUSTICE', 'CRIM'];
  const BUS_KEYS = ['BAP', 'BSA', 'BSBA', 'ACCOUNTANCY', 'BUSINESS ADMINISTRATION', 'BUSINESS'];
  const HM_KEYS = ['HMP', 'BSHM', 'HOSPITALITY MANAGEMENT', 'HOTEL AND RESTAURANT', 'HM'];
  const EDUC_KEYS = ['TEP', 'BSED', 'BEED', 'TEACHER EDUCATION', 'EDUCATION'];

  if (IT_KEYS.some((k) => s === k || s.startsWith(k) || k.startsWith(s))) return 'IT';
  if (CRIM_KEYS.some((k) => s === k || s.startsWith(k) || k.startsWith(s))) return 'CRIM';
  if (BUS_KEYS.some((k) => s === k || s.startsWith(k) || k.startsWith(s))) return 'BUS';
  if (HM_KEYS.some((k) => s === k || s.startsWith(k) || k.startsWith(s))) return 'HM';
  if (EDUC_KEYS.some((k) => s === k || s.startsWith(k) || k.startsWith(s))) return 'EDUC';

  return s;
}

function isProgramMatch(progA, progB) {
  if (!progA || !progB) return false;
  const a = String(progA).toUpperCase().trim();
  const b = String(progB).toUpperCase().trim();
  if (!a || !b) return false;
  if (a === 'ALL' || b === 'ALL') return false;
  if (a === b) return true;
  const famA = getProgramFamily(a);
  const famB = getProgramFamily(b);
  if (!famA || !famB || famA === 'GENED' || famB === 'GENED') return false;
  return famA === famB;
}

async function findExistingProgramHead(targetProgram, excludeUserId = null) {
  if (!targetProgram || !String(targetProgram).trim()) return null;
  const cleanTarget = String(targetProgram).trim();

  let rows = [];
  try {
    rows = await query(
      `SELECT u.id, u.name, u.email, u.role, u.status,
              COALESCE(u.program, pm.code, pm.program_code) AS program
       FROM users u
       LEFT JOIN program_majors pm ON pm.program_head_id = u.id
       WHERE u.role = 'program_head' AND (u.status = 'Active' OR u.status IS NULL)`
    );
  } catch (e) {
    rows = await query(
      `SELECT u.id, u.name, u.email, u.role, u.status,
              COALESCE(pm.code, pm.program_code) AS program
       FROM users u
       LEFT JOIN program_majors pm ON pm.program_head_id = u.id
       WHERE u.role = 'program_head' AND (u.status = 'Active' OR u.status IS NULL)`
    ).catch(() => []);
  }

  if (Array.isArray(rows)) {
    for (const u of rows) {
      if (excludeUserId && String(u.id) === String(excludeUserId)) {
        continue;
      }
      if (u.program && isProgramMatch(u.program, cleanTarget)) {
        return u;
      }
    }
  }

  try {
    const majors = await query(
      `SELECT pm.id, pm.code, pm.program_code, pm.program_head_id, u.status
       FROM program_majors pm
       INNER JOIN users u ON u.id = pm.program_head_id
       WHERE pm.program_head_id IS NOT NULL AND (u.status = 'Active' OR u.status IS NULL)`
    ).catch(() => []);

    if (Array.isArray(majors)) {
      for (const m of majors) {
        if (excludeUserId && String(m.program_head_id) === String(excludeUserId)) {
          continue;
        }
        if (isProgramMatch(m.code, cleanTarget) || isProgramMatch(m.program_code, cleanTarget)) {
          return { id: String(m.program_head_id), program: m.program_code || m.code };
        }
      }
    }
  } catch (e) {
    // ignore
  }

  return null;
}

async function listUsers() {
  let rows;
  try {
    rows = await query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
              COALESCE(u.program, pm.code, pm.program_code) AS program,
              t.id AS teacher_id
       FROM users u
       LEFT JOIN program_majors pm ON pm.program_head_id = u.id
       LEFT JOIN teachers t ON LOWER(t.email) = LOWER(u.email)
       ORDER BY u.id DESC`
    );
  } catch (e) {
    rows = await query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
              COALESCE(pm.code, pm.program_code) AS program,
              t.id AS teacher_id
       FROM users u
       LEFT JOIN program_majors pm ON pm.program_head_id = u.id
       LEFT JOIN teachers t ON LOWER(t.email) = LOWER(u.email)
       ORDER BY u.id DESC`
    );
  }

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

  if (role === 'teacher' || role === 'student') {
    const err = new Error(`${role === 'student' ? 'Student' : 'Teacher'} is not a valid system user role. Only Super Admin, Admin, and Program Head roles are supported.`);
    err.statusCode = 400;
    err.code = `${role.toUpperCase()}_ROLE_NOT_SUPPORTED`;
    throw err;
  }

  if (role === 'program_head') {
    if (!program || !String(program).trim()) {
      const err = new Error('Program is required for Program Head accounts.');
      err.statusCode = 400;
      err.code = 'PROGRAM_REQUIRED';
      throw err;
    }
    const existingHead = await findExistingProgramHead(program);
    if (existingHead) {
      const err = new Error('This program already has a Program Head assigned.');
      err.statusCode = 409;
      err.code = 'PROGRAM_HEAD_ALREADY_ASSIGNED';
      throw err;
    }
  }

  const accountStatus = status === 'Suspended' ? 'Suspended' : 'Active';
  let result;
  try {
    [result] = await query(
      'INSERT INTO users (name, email, password_hash, role, status, program) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, passwordHash, role, accountStatus, role === 'program_head' ? (program || null) : (program || null)]
    );
  } catch (e) {
    [result] = await query(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, role, accountStatus]
    );
  }
  const newId = (Array.isArray(result) ? result[0] : result)?.insertId || result.insertId || Date.now();

  if (role === 'program_head') {
    const targetProg = (program || '').trim();
    const [majorRow] = await query('SELECT id FROM program_majors WHERE code = ? OR program_code = ? LIMIT 1', [targetProg, targetProg]);
    if (majorRow) {
      await query('UPDATE program_majors SET program_head_id = ? WHERE id = ?', [newId, majorRow.id]);
    }
  }

  if (role === 'program_head') {
    const [existingTeacher] = await query('SELECT id FROM teachers WHERE email = ? LIMIT 1', [email]);
    if (!existingTeacher) {
      const teacherId = `FAC-HEAD-${Date.now().toString().slice(-4)}`;
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
  if (role === 'teacher' || role === 'student') {
    const err = new Error(`${role === 'student' ? 'Student' : 'Teacher'} is not a valid system user role. Only Super Admin, Admin, and Program Head roles are supported.`);
    err.statusCode = 400;
    err.code = `${role.toUpperCase()}_ROLE_NOT_SUPPORTED`;
    throw err;
  }

  const normalizedStatus = status
    ? (String(status).trim().toLowerCase() === 'suspended' ? 'Suspended' : 'Active')
    : null;

  // Determine effective role after update
  let targetRole = role;
  let currentProg = program;
  if (!targetRole || program === undefined) {
    const [existingUser] = await query('SELECT role, program FROM users WHERE id = ? LIMIT 1', [id]).catch(() => []);
    if (!targetRole && existingUser) {
      targetRole = existingUser.role;
    }
    if (program === undefined && existingUser) {
      currentProg = existingUser.program;
    }
  }

  if (targetRole === 'program_head') {
    const progToCheck = program !== undefined ? program : currentProg;
    if (!progToCheck || !String(progToCheck).trim()) {
      const err = new Error('Program is required for Program Head accounts.');
      err.statusCode = 400;
      err.code = 'PROGRAM_REQUIRED';
      throw err;
    }
    // Only block if a different active program head is assigned to this program
    const existingHead = await findExistingProgramHead(progToCheck, id);
    if (existingHead) {
      const err = new Error('This program already has a Program Head assigned.');
      err.statusCode = 409;
      err.code = 'PROGRAM_HEAD_ALREADY_ASSIGNED';
      throw err;
    }
  }

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

  if (role === 'program_head' || program !== undefined) {
    try {
      await query('UPDATE users SET program = ? WHERE id = ?', [targetRole === 'program_head' ? (program || currentProg || null) : null, id]);
    } catch (e) {
      // ignore if program column doesn't exist
    }
  }

  if (targetRole === 'program_head') {
    await query('UPDATE program_majors SET program_head_id = NULL WHERE program_head_id = ?', [id]);
    const targetProg = (program || currentProg || '').trim();
    if (targetProg) {
      const [majorRow] = await query('SELECT id FROM program_majors WHERE code = ? OR program_code = ? LIMIT 1', [targetProg, targetProg]);
      if (majorRow) {
        await query('UPDATE program_majors SET program_head_id = ? WHERE id = ?', [id, majorRow.id]);
      }
    }
  } else if (role && role !== 'program_head') {
    await query('UPDATE program_majors SET program_head_id = NULL WHERE program_head_id = ?', [id]);
  }

  if (targetRole === 'program_head' && email) {
    const [existingTeacher] = await query('SELECT id FROM teachers WHERE email = ? LIMIT 1', [email]);
    const targetProg = (program || currentProg || 'BSIT').trim();
    const [majorRow] = await query('SELECT id FROM program_majors WHERE code = ? OR program_code = ? LIMIT 1', [targetProg, targetProg]);
    if (!existingTeacher) {
      const teacherId = `FAC-HEAD-${Date.now().toString().slice(-4)}`;
      await query(
        'INSERT INTO teachers (id, name, email, phone, status, program_major_id) VALUES (?, ?, ?, ?, ?, ?)',
        [teacherId, name, email, null, 'Full-Time', majorRow?.id || null]
      );
    } else if (name) {
      await query('UPDATE teachers SET name = COALESCE(?, name), program_major_id = COALESCE(?, program_major_id) WHERE id = ?', [name, majorRow?.id || null, existingTeacher.id]);
    }
  }

  return { id, name, email, role: targetRole, program: currentProg, status };
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

  // NOTE: Requirement 2 & 8: Faculty entities MUST remain in database. Do NOT delete from teachers directory table.
  await query('DELETE FROM users WHERE id = ?', [id]);
}

const usersService = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  findExistingProgramHead,
  isProgramMatch,
  getProgramFamily,
};
module.exports = {
  usersService,
  findExistingProgramHead,
  isProgramMatch,
  getProgramFamily,
};

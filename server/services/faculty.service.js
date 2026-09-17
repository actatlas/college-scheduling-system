const { query } = require('../utils/db');
const { resolveUserProgramScope, isProgramMatch } = require('../utils/programScope');
const bcrypt = require('bcrypt');

async function listFaculty(user = null) {
  const scope = await resolveUserProgramScope(user);

  let teacherRows = [];
  try {
    teacherRows = await query(
      `SELECT t.id, t.name, t.first_name, t.last_name, t.employee_number, t.position, t.email, t.phone,
              COALESCE(t.faculty_type, t.status, 'Full-Time') AS status,
              COALESCE(t.faculty_type, t.status, 'Full-Time') AS faculty_type,
              t.program_major_id, pm.code AS program_major_code, pm.name AS program_major_name,
              pm.program_code AS program_code
       FROM teachers t
       LEFT JOIN program_majors pm ON pm.id = t.program_major_id
       ORDER BY t.name ASC`
    );
  } catch (e) {
    teacherRows = await query(
      `SELECT t.id, t.name, t.email, t.phone, t.status,
              t.program_major_id, pm.code AS program_major_code, pm.name AS program_major_name,
              pm.program_code AS program_code
       FROM teachers t
       LEFT JOIN program_majors pm ON pm.id = t.program_major_id
       ORDER BY t.name ASC`
    );
  }

  if (teacherRows.length === 0) return [];

  const ids = teacherRows.map((teacher) => teacher.id);
  const inClause = ids.map(() => '?').join(',');

  const subjectRows = await query(
    `SELECT s.instructor_id AS instructor_id, s.code, s.program_code
     FROM subjects s
     WHERE s.instructor_id IN (${inClause})`,
    ids
  ).catch(() => []);

  const subjectMap = new Map();
  const subjectProgramMap = new Map();
  for (const row of subjectRows) {
    const key = String(row.instructor_id);
    if (!subjectMap.has(key)) subjectMap.set(key, []);
    subjectMap.get(key).push(row.code);
    if (row.program_code) {
      if (!subjectProgramMap.has(key)) subjectProgramMap.set(key, new Set());
      subjectProgramMap.get(key).add(row.program_code);
    }
  }

  let mapped = teacherRows.map((teacher) => {
    const tProgCodes = [];
    if (teacher.program_major_code) tProgCodes.push(teacher.program_major_code);
    if (teacher.program_code) tProgCodes.push(teacher.program_code);
    const taughtProgs = subjectProgramMap.get(String(teacher.id));
    if (taughtProgs) {
      tProgCodes.push(...Array.from(taughtProgs));
    }

    return {
      id: String(teacher.id),
      name: teacher.name,
      firstName: teacher.first_name || '',
      lastName: teacher.last_name || '',
      employeeNumber: teacher.employee_number || `EMP-${String(teacher.id).replace(/^T-?/, '')}`,
      position: teacher.position || 'Faculty Instructor',
      department: teacher.program_major_name || teacher.program_major_code || '',
      departmentCode: teacher.program_major_code || '',
      programs: tProgCodes,
      email: teacher.email || '',
      phone: teacher.phone || '',
      status: teacher.status || 'Full-Time',
      facultyType: teacher.faculty_type || teacher.status || 'Full-Time',
      subjects: subjectMap.get(String(teacher.id)) || [],
    };
  });

  if (scope.isProgramHead) {
    const userEmail = (user?.email || '').toLowerCase().trim();
    const userName = (user?.name || '').toLowerCase().trim();
    const teacherId = user?.teacherId ? String(user.teacherId) : null;

    mapped = mapped.filter((t) => {
      // 1. Always include self (Program Head faculty entry)
      if (teacherId && String(t.id) === teacherId) return true;
      if (userEmail && t.email && t.email.toLowerCase().trim() === userEmail) return true;
      if (userName && t.name && t.name.toLowerCase().trim() === userName) return true;

      // 2. Department / Program Major match
      const tDept = t.department || t.departmentCode || '';
      if (scope.allowedProgramCodes.some((allowed) => isProgramMatch(tDept, allowed))) {
        return true;
      }

      // 3. Teachers with programs array matching allowed programs
      if (t.programs && t.programs.some((p) => scope.allowedProgramCodes.some((allowed) => isProgramMatch(p, allowed)))) {
        return true;
      }

      return false;
    });
  }

  return mapped;
}

async function createFaculty(payload) {
  const { id, name, department, email, phone, status, facultyType, position, employeeNumber, firstName, lastName } = payload;
  const fType = facultyType || status || 'Full-Time';
  const empNum = employeeNumber || `EMP-${String(id).replace(/^T-?/, '')}`;
  const fPos = position || 'Faculty Instructor';

  let fName = firstName || '';
  let lName = lastName || '';
  if (!fName && !lName && name) {
    const parts = name.split(',').map((s) => s.trim());
    lName = parts[0] || name;
    fName = parts[1] || '';
  }

  const [major] = await query('SELECT id FROM program_majors WHERE code = ? LIMIT 1', [department || 'BSIT']);
  try {
    await query(
      `INSERT INTO teachers (id, name, first_name, last_name, employee_number, position, email, phone, status, faculty_type, program_major_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, fName, lName, empNum, fPos, email || null, phone || null, fType, fType, major?.id || null]
    );
  } catch (e) {
    await query(
      `INSERT INTO teachers (id, name, email, phone, status, program_major_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, email || null, phone || null, fType, major?.id || null]
    );
  }

  if (email && email.trim()) {
    const [existingUser] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email.trim()]);
    if (!existingUser) {
      const passwordHash = await bcrypt.hash('@teacher123', 10);
      await query(
        'INSERT INTO users (name, email, password_hash, role, faculty_id) VALUES (?, ?, ?, ?, ?)',
        [name, email.trim(), passwordHash, 'teacher', id]
      );
    }
  }

  return { id, name, department, email, phone, status: fType, facultyType: fType, position: fPos, employeeNumber: empNum };
}

async function updateFaculty(id, payload) {
  let [oldTeacher] = await query('SELECT id, name, email, phone, status, program_major_id FROM teachers WHERE id = ? LIMIT 1', [id]);

  if (!oldTeacher && payload.email) {
    const [byEmail] = await query('SELECT id, name, email, phone, status, program_major_id FROM teachers WHERE LOWER(email) = LOWER(?) LIMIT 1', [payload.email]);
    if (byEmail) {
      oldTeacher = byEmail;
      id = byEmail.id;
    }
  }

  if (!oldTeacher) {
    const [major] = await query('SELECT id FROM program_majors WHERE code = ? LIMIT 1', [payload.department || 'BSIT']);
    const fType = payload.facultyType || payload.status || 'Full-Time';
    await query(
      `INSERT INTO teachers (id, name, email, phone, status, program_major_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, payload.name || 'Faculty Member', payload.email || null, payload.phone || null, fType, major?.id || null]
    );
    oldTeacher = { id, name: payload.name || 'Faculty Member', email: payload.email || null, status: fType };
  }

  const updates = [];
  const params = [];

  const fields = ['name', 'email', 'phone', 'status'];
  for (const field of fields) {
    if (payload[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(payload[field]);
    }
  }

  if (payload.facultyType !== undefined) {
    try {
      updates.push('faculty_type = ?');
      params.push(payload.facultyType);
    } catch {}
  }

  if (payload.position !== undefined) {
    try {
      updates.push('position = ?');
      params.push(payload.position);
    } catch {}
  }

  if (payload.programMajorId !== undefined) {
    updates.push('program_major_id = ?');
    params.push(payload.programMajorId);
  }

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE teachers SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  if (oldTeacher && oldTeacher.email) {
    const userUpdates = [];
    const userParams = [];
    if (payload.name !== undefined) {
      userUpdates.push('name = ?');
      userParams.push(payload.name);
    }
    if (payload.email !== undefined) {
      userUpdates.push('email = ?');
      userParams.push(payload.email);
    }
    if (userUpdates.length > 0) {
      userParams.push(oldTeacher.email);
      await query(`UPDATE users SET ${userUpdates.join(', ')} WHERE email = ?`, userParams);
    }
  }

  const [row] = await query('SELECT id, name, email, phone, status FROM teachers WHERE id = ? LIMIT 1', [id]);
  return {
    id: String(row?.id || id),
    name: row?.name || payload.name || oldTeacher?.name || 'Faculty Member',
    department: '',
    email: row?.email || payload.email || oldTeacher?.email || '',
    phone: row?.phone || payload.phone || '',
    status: row?.status || payload.status || oldTeacher?.status || 'Full-Time',
    facultyType: row?.status || payload.facultyType || 'Full-Time',
    subjects: [],
  };
}

async function deleteFaculty(id) {
  const [teacher] = await query('SELECT email FROM teachers WHERE id = ? LIMIT 1', [id]);
  if (!teacher) {
    const err = new Error('Faculty member not found');
    err.statusCode = 404;
    throw err;
  }

  if (teacher.email) {
    await query('DELETE FROM users WHERE email = ?', [teacher.email]);
  }

  await query('DELETE FROM teachers WHERE id = ?', [id]);
}

const facultyService = { listFaculty, createFaculty, updateFaculty, deleteFaculty };
module.exports = { facultyService };

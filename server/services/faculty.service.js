const { query } = require('../utils/db');

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatTo24HourTime(timeStr) {
  if (!timeStr) return null;
  const clean = String(timeStr).trim();
  const isPM = /pm/i.test(clean);
  const isAM = /am/i.test(clean);
  const raw = clean.replace(/am|pm/i, '').trim();
  const parts = raw.split(':');
  let h = Number(parts[0]) || 0;
  const m = String(parts[1] || '00').padStart(2, '0').slice(0, 2);
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  if (!isPM && !isAM && h >= 1 && h <= 7) h += 12;
  return `${String(h).padStart(2, '0')}:${m}:00`;
}

function expandDayPart(dayPart) {
  const d = String(dayPart || '').trim();
  const lower = d.toLowerCase();

  // Range syntax: "Monday-Friday", "Mon-Fri", "Monday to Friday"
  if (lower.includes('-') || lower.includes(' to ')) {
    const parts = lower.split(/-|\bto\b/).map((p) => p.trim());
    if (parts.length === 2) {
      const startIdx = ALL_DAYS.findIndex((day) => day.toLowerCase().startsWith(parts[0].slice(0, 3)));
      const endIdx = ALL_DAYS.findIndex((day) => day.toLowerCase().startsWith(parts[1].slice(0, 3)));
      if (startIdx !== -1 && endIdx !== -1 && startIdx <= endIdx) {
        return ALL_DAYS.slice(startIdx, endIdx + 1);
      }
    }
  }

  // Single day match
  const found = ALL_DAYS.find((day) => day.toLowerCase() === lower || day.toLowerCase().startsWith(lower.slice(0, 3)));
  return found ? [found] : [d];
}

function normalizeAvailability(input) {
  if (!input) return [];
  const segments = String(input).split('|').map((segment) => segment.trim()).filter(Boolean);
  const entries = [];
  for (const segment of segments) {
    const [dayPart, ...rest] = segment.split(':');
    if (!dayPart || rest.length === 0) continue;
    const days = expandDayPart(dayPart);
    const slots = rest.join(':').split(',').map((slot) => slot.trim()).filter(Boolean);
    for (const slot of slots) {
      const [startRaw, endRaw] = slot.split('-').map((value) => value.trim()).filter(Boolean);
      if (startRaw && endRaw) {
        const start = formatTo24HourTime(startRaw);
        const end = formatTo24HourTime(endRaw);
        if (start && end) {
          for (const day of days) {
            entries.push({ day_of_week: day, start_time: start, end_time: end });
          }
        }
      }
    }
  }
  return entries;
}

const { resolveUserProgramScope, isProgramMatch } = require('../utils/programScope');

async function listFaculty(user = null) {
  const scope = await resolveUserProgramScope(user);

  const teacherRows = await query(
    `SELECT t.id, t.name, t.email, t.phone, t.status, t.program_major_id, pm.code AS program_major_code, pm.name AS program_major_name,
            pm.program_code AS program_code
     FROM teachers t
     LEFT JOIN program_majors pm ON pm.id = t.program_major_id
     ORDER BY t.name ASC`
  );

  if (teacherRows.length === 0) return [];

  const ids = teacherRows.map((teacher) => teacher.id);
  const inClause = ids.map(() => '?').join(',');

  const subjectRows = await query(
    `SELECT s.instructor_id AS instructor_id, s.code, s.program_code
     FROM subjects s
     WHERE s.instructor_id IN (${inClause})`,
    ids
  );

  const availabilityRows = await query(
    `SELECT teacher_id, day_of_week, start_time, end_time
     FROM teacher_availability
     WHERE teacher_id IN (${inClause})`,
    ids,
  );

  const teacherAvailGroup = new Map();
  for (const row of availabilityRows) {
    const tId = String(row.teacher_id);
    if (!teacherAvailGroup.has(tId)) teacherAvailGroup.set(tId, new Map());
    const dayMap = teacherAvailGroup.get(tId);
    const day = row.day_of_week;
    if (!dayMap.has(day)) dayMap.set(day, []);
    const sStr = String(row.start_time).slice(0, 5);
    const eStr = String(row.end_time).slice(0, 5);
    dayMap.get(day).push(`${sStr}-${eStr}`);
  }

  const availabilityMap = new Map();
  for (const [tId, dayMap] of teacherAvailGroup.entries()) {
    const parts = [];
    for (const [day, slots] of dayMap.entries()) {
      parts.push(`${day}: ${slots.join(', ')}`);
    }
    availabilityMap.set(tId, parts.join(' | '));
  }

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
      department: teacher.program_major_name || teacher.program_major_code || '',
      departmentCode: teacher.program_major_code || '',
      programs: tProgCodes,
      email: teacher.email || '',
      phone: teacher.phone || '',
      status: teacher.status,
      availability: availabilityMap.get(String(teacher.id)) || '',
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

const bcrypt = require('bcrypt');

async function createFaculty(payload) {
  const { id, name, department, email, phone, status, availability } = payload;
  const [major] = await query('SELECT id FROM program_majors WHERE code = ? LIMIT 1', [department || 'BSIT']);
  await query(
    `INSERT INTO teachers (id, name, email, phone, status, program_major_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, email || null, phone || null, status || 'Full-Time', major?.id || null]
  );
  if (availability) {
    const normalized = normalizeAvailability(availability);
    if (normalized.length > 0) {
      const inserts = normalized.map((entry) => query(
        'INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
        [id, entry.day_of_week, entry.start_time, entry.end_time]
      ));
      await Promise.all(inserts);
    }
  }

  if (email && email.trim()) {
    const [existingUser] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email.trim()]);
    if (!existingUser) {
      const passwordHash = await bcrypt.hash('@teacher123', 10);
      await query(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [name, email.trim(), passwordHash, 'teacher']
      );
    }
  }

  return { id, name, department, email, phone, status, availability };
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
    await query(
      `INSERT INTO teachers (id, name, email, phone, status, program_major_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, payload.name || 'Faculty Member', payload.email || null, payload.phone || null, payload.status || 'Part-Time', major?.id || null]
    );
    oldTeacher = { id, name: payload.name || 'Faculty Member', email: payload.email || null, status: payload.status || 'Part-Time' };
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

  if (payload.programMajorId !== undefined) {
    updates.push('program_major_id = ?');
    params.push(payload.programMajorId);
  }

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE teachers SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  if (payload.availability !== undefined) {
    await query('DELETE FROM teacher_availability WHERE teacher_id = ?', [id]);
    const normalized = normalizeAvailability(payload.availability);
    if (normalized.length > 0) {
      const inserts = normalized.map((entry) => query(
        'INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
        [id, entry.day_of_week, entry.start_time, entry.end_time]
      ));
      await Promise.all(inserts);
    }
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
    status: row?.status || payload.status || oldTeacher?.status || 'Part-Time',
    availability: payload.availability || '',
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

  await query('DELETE FROM teacher_availability WHERE teacher_id = ?', [id]);
  await query('DELETE FROM teachers WHERE id = ?', [id]);
}

const facultyService = { listFaculty, createFaculty, updateFaculty, deleteFaculty };
module.exports = { facultyService };


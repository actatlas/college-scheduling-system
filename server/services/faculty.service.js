const { query } = require('../utils/db');

function normalizeAvailability(input) {
  if (!input) return [];
  const segments = String(input).split('|').map((segment) => segment.trim()).filter(Boolean);
  const entries = [];
  for (const segment of segments) {
    const [dayPart, ...rest] = segment.split(':');
    if (!dayPart || rest.length === 0) continue;
    const day = dayPart.trim();
    const slots = rest.join(':').split(',').map((slot) => slot.trim()).filter(Boolean);
    for (const slot of slots) {
      const [start, end] = slot.split('-').map((value) => value.trim()).filter(Boolean);
      if (start && end) {
        entries.push({ day_of_week: day, start_time: start, end_time: end });
      }
    }
  }
  return entries;
}

async function listFaculty() {
  const teacherRows = await query(
    `SELECT t.id, t.name, t.email, t.phone, t.status, t.program_major_id, pm.code AS program_major_code, pm.name AS program_major_name
     FROM teachers t
     LEFT JOIN program_majors pm ON pm.id = t.program_major_id
     ORDER BY t.name ASC`
  );

  if (teacherRows.length === 0) return [];

  const ids = teacherRows.map((teacher) => teacher.id);
  const inClause = ids.map(() => '?').join(',');

  const subjectRows = await query(
    `SELECT s.instructor_id AS instructor_id, s.code
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

  const availabilityMap = new Map();
  for (const row of availabilityRows) {
    const key = String(row.teacher_id);
    const current = availabilityMap.get(key) || [];
    current.push(`${row.day_of_week}: ${row.start_time}-${row.end_time}`);
    availabilityMap.set(key, current);
  }

  const subjectMap = new Map();
  for (const row of subjectRows) {
    const key = String(row.instructor_id);
    if (!subjectMap.has(key)) subjectMap.set(key, []);
    subjectMap.get(key).push(row.code);
  }

  return teacherRows.map((teacher) => ({
    id: String(teacher.id),
    name: teacher.name,
    department: teacher.program_major_name || teacher.program_major_code || '',
    email: teacher.email || '',
    phone: teacher.phone || '',
    status: teacher.status,
    availability: (availabilityMap.get(String(teacher.id)) || []).join(' | '),
    subjects: subjectMap.get(String(teacher.id)) || [],
  }));
}

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
  return { id, name, department, email, phone, status, availability };
}

async function updateFaculty(id, payload) {
  const [oldTeacher] = await query('SELECT email FROM teachers WHERE id = ? LIMIT 1', [id]);

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
  if (!row) {
    throw new Error('Faculty member not found');
  }
  return {
    id: String(row.id),
    name: row.name,
    department: '',
    email: row.email || '',
    phone: row.phone || '',
    status: row.status,
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


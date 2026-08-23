const { query } = require('../utils/db');
const { schedulesService } = require('./schedules.service');

function normalizeTime(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(str)) return str.slice(0, 5);
  if (/^\d{1,2}:\d{2}$/.test(str)) return str.padStart(5, '0');
  return `${str.padStart(2, '0')}:00`;
}

function toMinutes(value) {
  const [hour, minute = '0'] = String(value || '00:00').split(':').map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

function timesOverlap(startA, endA, startB, endB) {
  if (!startA || !endA || !startB || !endB) return false;
  const aStart = toMinutes(startA);
  const aEnd = toMinutes(endA);
  const bStart = toMinutes(startB);
  const bEnd = toMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
}

async function validateExamPayload({
  id = null,
  term = 'Midterm',
  examDate,
  startTime,
  endTime,
  subjectCode,
  room,
  proctorId,
  synchronizedSections = [],
  program = 'BSIT',
  user = null,
}) {
  const start = normalizeTime(startTime);
  const end = normalizeTime(endTime);

  if (!examDate || !start || !end || !subjectCode) {
    const err = new Error('examDate, start_time, end_time and subjectCode are required for exam scheduling.');
    err.statusCode = 400;
    err.code = 'INVALID_PAYLOAD';
    throw err;
  }

  // 1. Time range check
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  if (startMin >= endMin) {
    const err = new Error(`Invalid exam time range: start time (${start}) must be before end time (${end}).`);
    err.statusCode = 400;
    err.code = 'INVALID_TIME_RANGE';
    throw err;
  }

  // 2. Program Head authorization
  if (user && String(user.role).toLowerCase() === 'program_head') {
    let allowedPrograms = [];
    if (user.sub) {
      const majors = await query('SELECT program_code, code FROM program_majors WHERE program_head_id = ?', [user.sub]);
      for (const m of majors) {
        if (m.program_code) allowedPrograms.push(m.program_code);
        if (m.code) allowedPrograms.push(m.code);
      }
    }
    if (user.program) allowedPrograms.push(user.program);
    if (user.programCode) allowedPrograms.push(user.programCode);
    allowedPrograms = [...new Set(allowedPrograms.map((p) => String(p).toUpperCase()))];

    const targetProg = String(program || '').toUpperCase();
    const isAllowed = allowedPrograms.length === 0 || allowedPrograms.includes(targetProg) || allowedPrograms.some((p) => targetProg.includes(p));

    if (!isAllowed) {
      const err = new Error(`Unauthorized: Program Heads can only manage exam schedules within their assigned program (${allowedPrograms.join(', ')}).`);
      err.statusCode = 403;
      err.code = 'UNAUTHORIZED_PROGRAM_ACCESS';
      throw err;
    }
  }

  // 3. Exam Overlap Conflicts (Room, Proctor, Synchronized Sections)
  const existingExams = await query(
    `SELECT id, term, exam_date, start_time, end_time, subject_code, section_names, room_number, proctor_id, proctor_name, program_code
     FROM exam_schedules
     WHERE id != ?
     ORDER BY start_time ASC`,
    [id || 0],
  );

  const formattedExamDate = new Date(examDate).toISOString().split('T')[0];
  const newSections = Array.isArray(synchronizedSections) ? synchronizedSections : [synchronizedSections].filter(Boolean);

  for (const existing of existingExams) {
    const existingDate = existing.exam_date ? new Date(existing.exam_date).toISOString().split('T')[0] : '';
    if (existingDate !== formattedExamDate) continue;

    if (!timesOverlap(start, end, existing.start_time, existing.end_time)) continue;

    // Room Conflict
    if (room && existing.room_number && String(room).trim() === String(existing.room_number).trim()) {
      const err = new Error(`Room ${room} is already booked for examination "${existing.subject_code}" on ${formattedExamDate} (${String(existing.start_time).slice(0, 5)}-${String(existing.end_time).slice(0, 5)}).`);
      err.statusCode = 409;
      err.code = 'ROOM_CONFLICT';
      throw err;
    }

    // Proctor Conflict
    if (proctorId && existing.proctor_id && String(proctorId).trim() === String(existing.proctor_id).trim()) {
      const err = new Error(`Proctor is already assigned to another exam (${existing.subject_code}) on ${formattedExamDate} (${String(existing.start_time).slice(0, 5)}-${String(existing.end_time).slice(0, 5)}).`);
      err.statusCode = 409;
      err.code = 'PROCTOR_CONFLICT';
      throw err;
    }

    // Section Conflict
    let existingSecs = [];
    if (existing.section_names) {
      try {
        existingSecs = typeof existing.section_names === 'string' && existing.section_names.startsWith('[')
          ? JSON.parse(existing.section_names)
          : String(existing.section_names).split(',').map((s) => s.trim()).filter(Boolean);
      } catch {
        existingSecs = [existing.section_names];
      }
    }

    const hasCommonSection = newSections.some((sec) => existingSecs.includes(sec));
    if (hasCommonSection) {
      const err = new Error(`One or more assigned sections already have an examination scheduled at this time on ${formattedExamDate}.`);
      err.statusCode = 409;
      err.code = 'SECTION_CONFLICT';
      throw err;
    }
  }
}

async function listExamSchedules({ user, program } = {}) {
  let sql = `SELECT es.id,
            es.term,
            es.exam_date,
            es.start_time,
            es.end_time,
            es.subject_code,
            COALESCE(sub.name, es.subject_code) AS subject_name,
            es.section_names,
            es.room_number,
            es.building,
            es.proctor_id,
            COALESCE(es.proctor_name, t.name, '') AS proctor_name,
            es.program_code,
            es.color
     FROM exam_schedules es
     LEFT JOIN subjects sub ON sub.code = es.subject_code
     LEFT JOIN teachers t ON t.id = es.proctor_id`;

  const conditions = [];
  const params = [];

  const role = String(user?.role || '').toLowerCase();
  if (role === 'teacher') {
    let teacherId = user?.teacherId || null;
    if (!teacherId && user?.email) {
      const [tRow] = await query('SELECT id FROM teachers WHERE LOWER(TRIM(email)) = ? LIMIT 1', [user.email.trim().toLowerCase()]);
      if (tRow) teacherId = tRow.id;
    }
    if (!teacherId && user?.sub) {
      const [uRow] = await query('SELECT email FROM users WHERE id = ? LIMIT 1', [user.sub]);
      if (uRow && uRow.email) {
        const [tRow] = await query('SELECT id FROM teachers WHERE LOWER(TRIM(email)) = ? LIMIT 1', [uRow.email.trim().toLowerCase()]);
        if (tRow) teacherId = tRow.id;
      }
    }
    if (teacherId) {
      conditions.push('es.proctor_id = ?');
      params.push(teacherId);
    } else {
      return [];
    }
  } else if (role === 'program_head') {
    let progCodes = [];
    if (user?.sub) {
      const majors = await query('SELECT program_code, code FROM program_majors WHERE program_head_id = ?', [user.sub]);
      for (const m of majors) {
        if (m.program_code) progCodes.push(m.program_code);
        if (m.code) progCodes.push(m.code);
      }
    }
    if (progCodes.length === 0 && user?.program) progCodes.push(user.program);
    if (progCodes.length === 0 && user?.programCode) progCodes.push(user.programCode);
    progCodes = [...new Set(progCodes)];

    if (progCodes.length > 0) {
      const placeholders = progCodes.map(() => '?').join(',');
      conditions.push(`es.program_code IN (${placeholders})`);
      params.push(...progCodes);
    }
  } else if (program) {
    conditions.push('es.program_code = ?');
    params.push(program);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  sql += ' ORDER BY es.exam_date ASC, es.start_time ASC';
  const rows = await query(sql, params);

  return rows.map((e) => {
    const formattedDate = e.exam_date ? new Date(e.exam_date).toISOString().split('T')[0] : '';
    const startTimeStr = String(e.start_time || '').slice(0, 5);
    const endTimeStr = String(e.end_time || '').slice(0, 5);
    const timeRange = startTimeStr && endTimeStr ? `${startTimeStr}-${endTimeStr}` : (startTimeStr || '08:00-10:00');

    let sections = [];
    if (e.section_names) {
      try {
        sections = typeof e.section_names === 'string' && e.section_names.startsWith('[')
          ? JSON.parse(e.section_names)
          : String(e.section_names).split(',').map((s) => s.trim()).filter(Boolean);
      } catch {
        sections = [e.section_names];
      }
    }

    return {
      id: String(e.id),
      term: e.term,
      examDate: formattedDate,
      time: timeRange,
      startTime: e.start_time,
      endTime: e.end_time,
      subjectCode: e.subject_code,
      subject: e.subject_name || e.subject_code,
      synchronizedSections: sections,
      room: e.room_number || '',
      building: e.building || 'College Building',
      proctor: e.proctor_name || '',
      proctorId: e.proctor_id || '',
      program: e.program_code || 'BSIT',
      color: e.color || '#2563eb',
    };
  });
}

async function createExamSchedule(payload, user) {
  if (user && String(user.role).toLowerCase() === 'teacher') {
    const err = new Error('Teachers have read-only access and cannot create exam schedules.');
    err.statusCode = 403;
    err.code = 'UNAUTHORIZED_ROLE';
    throw err;
  }

  const {
    term = 'Midterm',
    examDate,
    time = '08:00-10:00',
    startTime,
    endTime,
    subjectCode,
    synchronizedSections = [],
    room,
    building = 'College Building',
    proctor,
    proctorId,
    program = 'BSIT',
    color = '#2563eb',
  } = payload;

  const [tSt, tEt] = String(time).split('-').map((t) => t.trim());
  const finalStart = startTime || tSt || '08:00';
  const finalEnd = endTime || tEt || '10:00';
  const formattedStart = normalizeTime(finalStart);
  const formattedEnd = normalizeTime(finalEnd);

  await validateExamPayload({
    term,
    examDate,
    startTime: formattedStart,
    endTime: formattedEnd,
    subjectCode,
    room,
    proctorId,
    synchronizedSections,
    program,
    user,
  });

  const sectionNamesStr = JSON.stringify(Array.isArray(synchronizedSections) ? synchronizedSections : [synchronizedSections]);

  const res = await query(
    `INSERT INTO exam_schedules (term, exam_date, start_time, end_time, subject_code, section_names, room_number, building, proctor_id, proctor_name, program_code, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      term,
      examDate || new Date().toISOString().split('T')[0],
      formattedStart,
      formattedEnd,
      subjectCode || 'IT101',
      sectionNamesStr,
      room || null,
      building,
      proctorId || null,
      proctor || null,
      program,
      color,
    ]
  );

  const insertObj = Array.isArray(res) ? res[0] : res;
  const generatedId = insertObj?.insertId ? String(insertObj.insertId) : String(Date.now());

  return {
    id: generatedId,
    term,
    examDate,
    time: `${formattedStart}-${formattedEnd}`,
    subjectCode,
    synchronizedSections: Array.isArray(synchronizedSections) ? synchronizedSections : [synchronizedSections],
    room,
    building,
    proctor,
    proctorId,
    program,
    color,
  };
}

async function updateExamSchedule(id, payload, user) {
  if (user && String(user.role).toLowerCase() === 'teacher') {
    const err = new Error('Teachers have read-only access and cannot update exam schedules.');
    err.statusCode = 403;
    err.code = 'UNAUTHORIZED_ROLE';
    throw err;
  }

  const {
    term,
    examDate,
    time,
    startTime,
    endTime,
    subjectCode,
    synchronizedSections,
    room,
    building,
    proctor,
    proctorId,
    program,
    color,
  } = payload;

  let formattedStart = startTime ? normalizeTime(startTime) : null;
  let formattedEnd = endTime ? normalizeTime(endTime) : null;
  if (!formattedStart && time) {
    const [st, et] = String(time).split('-').map((t) => t.trim());
    if (st) formattedStart = normalizeTime(st);
    if (et) formattedEnd = normalizeTime(et);
  }

  if (examDate || formattedStart || formattedEnd || room || proctorId) {
    const [existing] = await query('SELECT * FROM exam_schedules WHERE id = ? LIMIT 1', [id]);
    if (!existing) {
      const err = new Error('Exam schedule not found');
      err.statusCode = 404;
      err.code = 'EXAM_NOT_FOUND';
      throw err;
    }

    await validateExamPayload({
      id,
      term: term || existing.term,
      examDate: examDate || existing.exam_date,
      startTime: formattedStart || existing.start_time,
      endTime: formattedEnd || existing.end_time,
      subjectCode: subjectCode || existing.subject_code,
      room: room !== undefined ? room : existing.room_number,
      proctorId: proctorId !== undefined ? proctorId : existing.proctor_id,
      synchronizedSections: synchronizedSections !== undefined ? synchronizedSections : existing.section_names,
      program: program || existing.program_code,
      user,
    });
  }

  const sectionNamesStr = synchronizedSections ? JSON.stringify(synchronizedSections) : null;

  await query(
    `UPDATE exam_schedules
     SET term = COALESCE(?, term),
         exam_date = COALESCE(?, exam_date),
         start_time = COALESCE(?, start_time),
         end_time = COALESCE(?, end_time),
         subject_code = COALESCE(?, subject_code),
         section_names = COALESCE(?, section_names),
         room_number = COALESCE(?, room_number),
         building = COALESCE(?, building),
         proctor_id = COALESCE(?, proctor_id),
         proctor_name = COALESCE(?, proctor_name),
         program_code = COALESCE(?, program_code),
         color = COALESCE(?, color)
     WHERE id = ?`,
    [
      term || null,
      examDate || null,
      formattedStart,
      formattedEnd,
      subjectCode || null,
      sectionNamesStr,
      room || null,
      building || null,
      proctorId || null,
      proctor || null,
      program || null,
      color || null,
      id,
    ]
  );

  return { id: String(id), ...payload };
}

async function deleteExamSchedule(id, user) {
  if (user && String(user.role).toLowerCase() === 'teacher') {
    const err = new Error('Teachers have read-only access and cannot delete exam schedules.');
    err.statusCode = 403;
    err.code = 'UNAUTHORIZED_ROLE';
    throw err;
  }

  const [existing] = await query('SELECT id, program_code FROM exam_schedules WHERE id = ? LIMIT 1', [id]);
  if (!existing) {
    const err = new Error('Exam schedule not found');
    err.statusCode = 404;
    err.code = 'EXAM_NOT_FOUND';
    throw err;
  }

  if (user && String(user.role).toLowerCase() === 'program_head') {
    let allowedPrograms = [];
    if (user.sub) {
      const majors = await query('SELECT program_code, code FROM program_majors WHERE program_head_id = ?', [user.sub]);
      for (const m of majors) {
        if (m.program_code) allowedPrograms.push(m.program_code);
        if (m.code) allowedPrograms.push(m.code);
      }
    }
    if (user.program) allowedPrograms.push(user.program);
    if (user.programCode) allowedPrograms.push(user.programCode);
    allowedPrograms = [...new Set(allowedPrograms.map((p) => String(p).toUpperCase()))];

    const targetProg = String(existing.program_code || '').toUpperCase();
    const isAllowed = allowedPrograms.length === 0 || allowedPrograms.includes(targetProg) || allowedPrograms.some((p) => targetProg.includes(p));

    if (!isAllowed) {
      const err = new Error(`Unauthorized: Program Heads can only delete exam schedules within their assigned program (${allowedPrograms.join(', ')}).`);
      err.statusCode = 403;
      err.code = 'UNAUTHORIZED_PROGRAM_ACCESS';
      throw err;
    }
  }

  await query('DELETE FROM exam_schedules WHERE id = ?', [id]);
  return { message: 'Exam schedule deleted successfully' };
}

module.exports = {
  examSchedulesService: {
    listExamSchedules,
    createExamSchedule,
    updateExamSchedule,
    deleteExamSchedule,
    validateExamPayload,
  },
};

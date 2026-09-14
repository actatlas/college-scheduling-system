const { query } = require('../utils/db');
const { schedulesService } = require('./schedules.service');
const { isGeneralEducationSubject } = require('./subjects.service');
const { resolveUserProgramScope, isProgramMatch } = require('../utils/programScope');


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

const DEFAULT_EXAM_PERIOD_DATES = {
  Prelim: '2026-08-19',
  Midterm: '2026-10-15',
  'Semi-Final': '2026-12-10',
  Final: '2027-03-05',
};

async function getExamPeriodSettings() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    const [row] = await query('SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1', ['exam_period_dates']);
    if (row && row.setting_value) {
      try {
        const parsed = JSON.parse(row.setting_value);
        return { ...DEFAULT_EXAM_PERIOD_DATES, ...parsed };
      } catch {
        return DEFAULT_EXAM_PERIOD_DATES;
      }
    }
  } catch {
    // Return default if offline/table not ready
  }
  return DEFAULT_EXAM_PERIOD_DATES;
}

async function updateExamPeriodSettings(payload, user) {
  if (user && !['admin', 'super_admin'].includes(String(user.role).toLowerCase())) {
    const err = new Error('Forbidden. Only Administrators can configure official examination dates.');
    err.statusCode = 403;
    err.code = 'UNAUTHORIZED_ROLE';
    throw err;
  }

  const current = await getExamPeriodSettings();
  const updated = {
    Prelim: payload.Prelim || current.Prelim || '',
    Midterm: payload.Midterm || current.Midterm || '',
    'Semi-Final': payload['Semi-Final'] || payload.SemiFinal || current['Semi-Final'] || '',
    Final: payload.Final || current.Final || '',
  };

  const valStr = JSON.stringify(updated);
  await query(
    `INSERT INTO system_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = ?`,
    ['exam_period_dates', valStr, valStr]
  );

  return updated;
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

  // Official Examination Date Validation
  const officialDates = await getExamPeriodSettings();
  const officialDate = officialDates[term];
  let formattedExamDate = '';
  if (examDate) {
    if (typeof examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(examDate.trim())) {
      formattedExamDate = examDate.trim();
    } else {
      const parsedDate = new Date(examDate);
      const y = parsedDate.getFullYear();
      const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const d = String(parsedDate.getDate()).padStart(2, '0');
      formattedExamDate = `${y}-${m}-${d}`;
    }
  }

  const isProgramHead = user && String(user.role).toLowerCase() === 'program_head';

  if (isProgramHead) {
    if (!officialDate) {
      const err = new Error(`${term} examination date has not yet been configured by the Admin.`);
      err.statusCode = 400;
      err.code = 'EXAM_DATE_NOT_SET';
      throw err;
    }
    if (formattedExamDate !== officialDate) {
      const err = new Error(`${term} examinations are officially scheduled for ${officialDate}.`);
      err.statusCode = 400;
      err.code = 'INVALID_EXAM_DATE';
      throw err;
    }
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

  if (endMin - startMin < 30) {
    const err = new Error('Exam duration must be at least 30 minutes.');
    err.statusCode = 400;
    err.code = 'INVALID_TIME_RANGE';
    throw err;
  }

  // 2. Room Usability & Status Check
  if (room) {
    const [roomRow] = await query('SELECT number, capacity, building, type, status FROM rooms WHERE number = ? LIMIT 1', [room]);
    if (roomRow) {
      const status = String(roomRow.status || '').trim().toLowerCase();
      const isUnavailable = ['maintenance', 'under maintenance', 'inactive', 'unavailable', 'closed', 'disabled'].includes(status);
      if (isUnavailable) {
        const err = new Error(`Room ${roomRow.number} is currently marked as "${roomRow.status}" and cannot be booked for examinations.`);
        err.statusCode = 409;
        err.code = 'ROOM_UNAVAILABLE';
        throw err;
      }
    }
  }

  // 3. Program Head authorization
  if (user && String(user.role).toLowerCase() === 'program_head') {
    const scope = resolveUserProgramScope(user);
    const targetProg = String(program || '').toUpperCase().trim();
    const isAllowed = scope.allowedProgramCodes.some((p) => isProgramMatch(targetProg, p));

    if (!isAllowed) {
      const err = new Error(`Unauthorized: Program Heads can only manage exam schedules within their assigned program (${scope.allowedProgramCodes.join(', ')}).`);
      err.statusCode = 403;
      err.code = 'UNAUTHORIZED_PROGRAM_ACCESS';
      throw err;
    }

    if (subjectCode) {
      const [subRow] = await query('SELECT code, name, program_code FROM subjects WHERE code = ? LIMIT 1', [subjectCode]);
      if (subRow) {
        const isGE = isGeneralEducationSubject(subRow.code, subRow.program_code, subRow.name);
        if (isGE) {
          const err = new Error('Unauthorized: Program Heads can only schedule examinations for Major subjects within their assigned program. General Education and Minor subjects are managed by Administrators.');
          err.statusCode = 403;
          err.code = 'UNAUTHORIZED_EXAM_SUBJECT';
          throw err;
        }

        const subProg = String(subRow.program_code || '').toUpperCase().trim();
        const matchesSubProg = scope.allowedProgramCodes.some((p) => isProgramMatch(subProg, p));
        if (!matchesSubProg) {
          const err = new Error(`Unauthorized: Subject ${subRow.code} belongs to another academic program and cannot be scheduled by this Program Head.`);
          err.statusCode = 403;
          err.code = 'UNAUTHORIZED_PROGRAM_ACCESS';
          throw err;
        }
      }
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
    let teacherName = user?.name || null;
    if (!teacherId && user?.email) {
      const [tRow] = await query('SELECT id, name FROM teachers WHERE LOWER(TRIM(email)) = ? LIMIT 1', [user.email.trim().toLowerCase()]);
      if (tRow) {
        teacherId = tRow.id;
        if (!teacherName) teacherName = tRow.name;
      }
    }
    if (!teacherId && user?.sub) {
      const [uRow] = await query('SELECT id, name, email FROM users WHERE id = ? LIMIT 1', [user.sub]);
      if (uRow) {
        if (!teacherName) teacherName = uRow.name;
        if (uRow.email) {
          const [tRow] = await query('SELECT id, name FROM teachers WHERE LOWER(TRIM(email)) = ? OR LOWER(TRIM(name)) = ? LIMIT 1', [
            uRow.email.trim().toLowerCase(),
            (uRow.name || '').trim().toLowerCase(),
          ]);
          if (tRow) {
            teacherId = tRow.id;
            if (!teacherName) teacherName = tRow.name;
          }
        }
      }
    }

    const orConds = [];
    if (teacherId) {
      orConds.push('es.proctor_id = ?');
      params.push(String(teacherId).trim());
      orConds.push('sub.instructor_id = ?');
      params.push(String(teacherId).trim());
    }
    if (teacherName) {
      const cleanName = teacherName.trim().toLowerCase();
      orConds.push('LOWER(TRIM(es.proctor_name)) = ? OR LOWER(TRIM(t.name)) = ?');
      params.push(cleanName, cleanName);
      orConds.push('LOWER(es.proctor_name) LIKE ? OR LOWER(t.name) LIKE ?');
      params.push(`%${cleanName}%`, `%${cleanName}%`);
    }

    if (orConds.length > 0) {
      conditions.push(`(${orConds.join(' OR ')})`);
    } else {
      return [];
    }
  } else if (role === 'program_head') {
    const scope = resolveUserProgramScope(user);
    const progCodes = scope.allowedProgramCodes;

    if (progCodes.length > 0) {
      const placeholders = progCodes.map(() => '?').join(',');
      conditions.push(`(es.program_code IN (${placeholders}) OR sub.program_code IN (${placeholders}))`);
      params.push(...progCodes, ...progCodes);
    }
  } else if (program) {
    conditions.push('(es.program_code = ? OR es.program_code = \'ALL\' OR sub.program_code = \'ALL\')');
    params.push(program);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  sql += ' ORDER BY es.exam_date ASC, es.start_time ASC';
  const rows = await query(sql, params);

  return rows.map((e) => {
    let formattedDate = '';
    if (e.exam_date) {
      if (typeof e.exam_date === 'string') {
        formattedDate = e.exam_date.slice(0, 10);
      } else if (e.exam_date instanceof Date) {
        const y = e.exam_date.getFullYear();
        const m = String(e.exam_date.getMonth() + 1).padStart(2, '0');
        const d = String(e.exam_date.getDate()).padStart(2, '0');
        formattedDate = `${y}-${m}-${d}`;
      } else {
        formattedDate = String(e.exam_date).slice(0, 10);
      }
    }
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

  let finalProctorId = proctorId || null;
  let finalProctorName = proctor || null;
  if (finalProctorId && !finalProctorName) {
    const [t] = await query('SELECT name FROM teachers WHERE id = ? LIMIT 1', [finalProctorId]);
    if (t) finalProctorName = t.name;
  } else if (!finalProctorId && finalProctorName) {
    const [t] = await query('SELECT id FROM teachers WHERE LOWER(TRIM(name)) = ? LIMIT 1', [finalProctorName.trim().toLowerCase()]);
    if (t) finalProctorId = t.id;
  }

  await validateExamPayload({
    term,
    examDate,
    startTime: formattedStart,
    endTime: formattedEnd,
    subjectCode,
    room,
    proctorId: finalProctorId,
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
      finalProctorId,
      finalProctorName,
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
    proctor: finalProctorName,
    proctorId: finalProctorId,
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

  let finalProctorId = proctorId !== undefined ? proctorId : null;
  let finalProctorName = proctor !== undefined ? proctor : null;
  if (finalProctorId && !finalProctorName) {
    const [t] = await query('SELECT name FROM teachers WHERE id = ? LIMIT 1', [finalProctorId]);
    if (t) finalProctorName = t.name;
  } else if (!finalProctorId && finalProctorName) {
    const [t] = await query('SELECT id FROM teachers WHERE LOWER(TRIM(name)) = ? LIMIT 1', [finalProctorName.trim().toLowerCase()]);
    if (t) finalProctorId = t.id;
  }

  if (examDate || formattedStart || formattedEnd || room || finalProctorId) {
    const [existing] = await query('SELECT * FROM exam_schedules WHERE id = ? LIMIT 1', [id]);
    if (!existing) {
      const err = new Error('Exam schedule not found');
      err.statusCode = 404;
      err.code = 'EXAM_NOT_FOUND';
      throw err;
    }

    if (user && String(user.role).toLowerCase() === 'program_head') {
      const scope = resolveUserProgramScope(user);
      const isAllowed = scope.allowedProgramCodes.some((p) => isProgramMatch(existing.program_code, p));
      if (!isAllowed) {
        const err = new Error(`Unauthorized: Program Heads can only update exam schedules within their assigned program (${scope.allowedProgramCodes.join(', ')}).`);
        err.statusCode = 403;
        err.code = 'UNAUTHORIZED_PROGRAM_ACCESS';
        throw err;
      }
    }

    await validateExamPayload({
      id,
      term: term || existing.term,
      examDate: examDate || existing.exam_date,
      startTime: formattedStart || existing.start_time,
      endTime: formattedEnd || existing.end_time,
      subjectCode: subjectCode || existing.subject_code,
      room: room !== undefined ? room : existing.room_number,
      proctorId: finalProctorId !== null ? finalProctorId : existing.proctor_id,
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
      finalProctorId,
      finalProctorName,
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
    const scope = resolveUserProgramScope(user);
    const isAllowed = scope.allowedProgramCodes.some((p) => isProgramMatch(existing.program_code, p));

    if (!isAllowed) {
      const err = new Error(`Unauthorized: Program Heads can only delete exam schedules within their assigned program (${scope.allowedProgramCodes.join(', ')}).`);
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
    getExamPeriodSettings,
    updateExamPeriodSettings,
  },
};

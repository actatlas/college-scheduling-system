const { query } = require('../utils/db');

const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PROGRAM_COURSE_MAP = {
  BSIT: ['BSIT', 'ITP', 'IT', 'INFORMATION TECHNOLOGY'],
  ITP: ['BSIT', 'ITP', 'IT', 'INFORMATION TECHNOLOGY'],
  BSBA: ['BSBA', 'BAP', 'BA', 'BUSINESS ADMINISTRATION'],
  BAP: ['BSBA', 'BAP', 'BA', 'BUSINESS ADMINISTRATION'],
  BSHM: ['BSHM', 'HMP', 'HM', 'HOSPITALITY MANAGEMENT'],
  HMP: ['BSHM', 'HMP', 'HM', 'HOSPITALITY MANAGEMENT'],
  BSCRIM: ['BSCRIM', 'CJEP', 'CRIM', 'CRIMINAL JUSTICE'],
  CJEP: ['BSCRIM', 'CJEP', 'CRIM', 'CRIMINAL JUSTICE'],
  TEP: ['TEP', 'BSED', 'BEED', 'EDUC', 'EDUCATION', 'TEACHER EDUCATION'],
  BSED: ['TEP', 'BSED', 'BEED', 'EDUC', 'EDUCATION', 'TEACHER EDUCATION'],
  BEED: ['TEP', 'BSED', 'BEED', 'EDUC', 'EDUCATION', 'TEACHER EDUCATION'],
};

function normalizeTime(value) {
  if (!value) return null;
  const str = String(value).trim();
  const isPM = /pm/i.test(str);
  const isAM = /am/i.test(str);
  const numbersPart = str.replace(/[^\d:]/g, '');
  const parts = numbersPart.split(':');
  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  const s = parseInt(parts[2], 10) || 0;
  if (isNaN(h)) return null;

  if (isPM) {
    if (h < 12) h += 12;
  } else if (isAM) {
    if (h === 12) h = 0;
  } else if (h >= 1 && h <= 6) {
    h += 12;
  }

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function toMinutes(value) {
  if (!value) return 0;
  const normalized = normalizeTime(value);
  if (!normalized) return 0;
  const [h, m] = normalized.split(':').map(Number);
  return h * 60 + m;
}

function timesOverlap(startA, endA, startB, endB) {
  if (!startA || !endA || !startB || !endB) return false;
  const aStart = toMinutes(startA);
  const aEnd = toMinutes(endA);
  const bStart = toMinutes(startB);
  const bEnd = toMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
}

function isWithinWindow(start, end, windowStart, windowEnd) {
  if (!start || !end || !windowStart || !windowEnd) return false;
  const s = toMinutes(start);
  const e = toMinutes(end);
  const ws = toMinutes(windowStart);
  const we = toMinutes(windowEnd);
  return ws <= s && we >= e;
}

async function validateSchedulePayload({
  id = null,
  day,
  start_time,
  end_time,
  subject_code,
  section_id,
  faculty_id,
  room_number,
  modality = 'Face-to-Face',
  user = null,
}) {
  const start = normalizeTime(start_time);
  const end = normalizeTime(end_time);
  const isOnline = String(modality || '').toLowerCase() === 'online' || String(room_number || '').toLowerCase().includes('virtual');

  if (!day || !start || !end || !subject_code) {
    const err = new Error('day, start_time, end_time and subject_code are required');
    err.statusCode = 400;
    err.code = 'INVALID_PAYLOAD';
    throw err;
  }

  // 1. Validate Day
  const normalizedDay = VALID_DAYS.find((d) => d.toLowerCase() === String(day).trim().toLowerCase());
  if (!normalizedDay) {
    const err = new Error(`Invalid day "${day}". Must be one of: ${VALID_DAYS.join(', ')}`);
    err.statusCode = 400;
    err.code = 'INVALID_TIME_RANGE';
    throw err;
  }

  // 2. Validate Time Range
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  if (startMin >= endMin) {
    const err = new Error(`Invalid time range: start time (${start}) must be before end time (${end}).`);
    err.statusCode = 400;
    err.code = 'INVALID_TIME_RANGE';
    throw err;
  }

  if (endMin - startMin < 30) {
    const err = new Error('Schedule duration must be at least 30 minutes.');
    err.statusCode = 400;
    err.code = 'INVALID_TIME_RANGE';
    throw err;
  }

  // 3. Validate Academic Dependencies Existence
  const [subjectRow] = await query('SELECT code, name, program_code, lab_hours, lecture_hours FROM subjects WHERE code = ? LIMIT 1', [subject_code]);
  if (!subjectRow) {
    const err = new Error(`Subject with code "${subject_code}" does not exist.`);
    err.statusCode = 404;
    err.code = 'ACADEMIC_DEPENDENCY_MISSING';
    throw err;
  }

  let teacherRow = null;
  if (faculty_id) {
    const [t] = await query('SELECT id, name, status, program_major_id FROM teachers WHERE id = ? LIMIT 1', [faculty_id]);
    if (!t) {
      const err = new Error(`Faculty member with ID "${faculty_id}" does not exist.`);
      err.statusCode = 404;
      err.code = 'ACADEMIC_DEPENDENCY_MISSING';
      throw err;
    }
    teacherRow = t;
  }

  let roomRow = null;
  if (!isOnline && room_number) {
    const [r] = await query('SELECT number, capacity, building, type, status FROM rooms WHERE number = ? LIMIT 1', [room_number]);
    if (!r) {
      const err = new Error(`Room with number "${room_number}" does not exist.`);
      err.statusCode = 404;
      err.code = 'ACADEMIC_DEPENDENCY_MISSING';
      throw err;
    }
    roomRow = r;
  }

  let sectionRow = null;
  if (section_id) {
    const [sec] = await query('SELECT id, course_code, year_level, section_label, students FROM sections WHERE id = ? LIMIT 1', [section_id]);
    if (!sec) {
      const err = new Error(`Section with ID "${section_id}" does not exist.`);
      err.statusCode = 404;
      err.code = 'ACADEMIC_DEPENDENCY_MISSING';
      throw err;
    }
    sectionRow = sec;
  }

  // 4. Program Head Authorization
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

    const subProg = String(subjectRow.program_code || '').toUpperCase();
    const secProg = String(sectionRow?.course_code || '').toUpperCase();

    const isSubAllowed = allowedPrograms.length === 0 || allowedPrograms.includes(subProg) || allowedPrograms.some((p) => subProg.includes(p));
    const isSecAllowed = !sectionRow || allowedPrograms.length === 0 || allowedPrograms.includes(secProg) || allowedPrograms.some((p) => secProg.includes(p));

    if (!isSubAllowed && !isSecAllowed) {
      const err = new Error(`Unauthorized: Program Heads can only manage schedules within their assigned program (${allowedPrograms.join(', ')}).`);
      err.statusCode = 403;
      err.code = 'UNAUTHORIZED_PROGRAM_ACCESS';
      throw err;
    }
  }

  // 5. Room Status Usability Check
  if (roomRow) {
    const status = String(roomRow.status || '').trim().toLowerCase();
    const isUnavailable = ['maintenance', 'under maintenance', 'inactive', 'unavailable', 'closed', 'disabled'].includes(status);
    if (isUnavailable) {
      const err = new Error(`Room ${roomRow.number} is currently marked as "${roomRow.status}" and cannot be scheduled.`);
      err.statusCode = 409;
      err.code = 'ROOM_UNAVAILABLE';
      throw err;
    }
  }

  // 6. Subject-Section Program Relationship Compatibility
  if (subjectRow && sectionRow) {
    const subProg = String(subjectRow.program_code || '').trim().toUpperCase();
    const secCourse = String(sectionRow.course_code || '').trim().toUpperCase();
    const isGeneralEd = !subProg || ['ALL', 'GEN ED', 'GENERAL EDUCATION', 'GENED'].includes(subProg);
    const subAliases = PROGRAM_COURSE_MAP[subProg] || [subProg];
    const secAliases = PROGRAM_COURSE_MAP[secCourse] || [secCourse];
    const hasAliasMatch = isGeneralEd || secAliases.some((sa) => subAliases.some((sb) => sa === sb || sa.includes(sb) || sb.includes(sa)));

    if (!hasAliasMatch && subProg && secCourse && subProg !== secCourse && !secCourse.includes(subProg) && !subProg.includes(secCourse)) {
      const [courseMatch] = await query('SELECT code FROM courses WHERE code = ? AND program_code = ? LIMIT 1', [sectionRow.course_code, subjectRow.program_code]);
      const [majorMatch] = await query('SELECT code FROM program_majors WHERE code = ? AND program_code = ? LIMIT 1', [sectionRow.course_code, subjectRow.program_code]);
      const allMajors = await query('SELECT program_code, code FROM program_majors WHERE program_head_id IS NOT NULL OR code IS NOT NULL');
      const matchingFromAll = Array.isArray(allMajors) && allMajors.some((m) => String(m.code).toUpperCase() === secCourse && String(m.program_code).toUpperCase() === subProg);
      if (!courseMatch && !majorMatch && !matchingFromAll) {
        const err = new Error(`Subject "${subjectRow.code}" (${subProg}) is not part of the curriculum for section "${sectionRow.course_code} ${sectionRow.year_level}-${sectionRow.section_label}".`);
        err.statusCode = 400;
        err.code = 'INVALID_SUBJECT_SECTION_RELATIONSHIP';
        throw err;
      }
    }
  }

  // 7. Room Capacity Compatibility
  if (roomRow && sectionRow && sectionRow.students) {
    if (Number(roomRow.capacity) < Number(sectionRow.students)) {
      const err = new Error(`Room ${roomRow.number} capacity (${roomRow.capacity}) is smaller than the section student headcount (${sectionRow.students}).`);
      err.statusCode = 409;
      err.code = 'ROOM_CAPACITY_EXCEEDED';
      throw err;
    }
  }

  // 8. Subject & Room Type Compatibility (Laboratory vs Lecture)
  if (roomRow && subjectRow) {
    const isLabSubject = Number(subjectRow.lab_hours || 0) > 0;
    const isLabRoom = /lab/i.test(roomRow.type || '') || /lab/i.test(roomRow.building || '');
    if (isLabSubject && !isLabRoom) {
      const err = new Error(`Subject "${subjectRow.code}" requires a Laboratory room, but room "${roomRow.number}" is a ${roomRow.type || 'Lecture'} room.`);
      err.statusCode = 409;
      err.code = 'ROOM_TYPE_MISMATCH';
      throw err;
    }
  }

  // 9. Faculty Availability Windows
  if (teacherRow) {
    const availabilityRows = await query(
      `SELECT day_of_week, start_time, end_time
       FROM teacher_availability
       WHERE teacher_id = ?`,
      [faculty_id],
    );

    if (teacherRow.status === 'Part-Time') {
      if (availabilityRows.length === 0) {
        const err = new Error(`Part-Time instructor ${teacherRow.name} has no registered availability configured.`);
        err.statusCode = 409;
        err.code = 'FACULTY_UNAVAILABLE';
        throw err;
      }

      const dayRows = availabilityRows.filter((entry) => {
        const entryDay = String(entry.day_of_week || '').toLowerCase();
        const targetDay = normalizedDay.toLowerCase();
        return entryDay.includes(targetDay) || targetDay.includes(entryDay);
      });

      const intervals = dayRows.map((r) => ({
        start: toMinutes(r.start_time),
        end: toMinutes(r.end_time),
      })).sort((a, b) => a.start - b.start);

      const merged = [];
      for (const iv of intervals) {
        if (merged.length === 0) {
          merged.push({ ...iv });
        } else {
          const prev = merged[merged.length - 1];
          if (iv.start <= prev.end) {
            prev.end = Math.max(prev.end, iv.end);
          } else {
            merged.push({ ...iv });
          }
        }
      }

      const startMin = toMinutes(start);
      const endMin = toMinutes(end);
      const matchesWindow = merged.some((m) => m.start <= startMin && m.end >= endMin);

      if (!matchesWindow) {
        const availableSlotsStr = availabilityRows
          .map((r) => `${r.day_of_week} ${String(r.start_time).slice(0, 5)}-${String(r.end_time).slice(0, 5)}`)
          .join(', ');
        const err = new Error(`The requested schedule (${normalizedDay} ${start}-${end}) falls outside Part-Time instructor ${teacherRow.name}'s registered availability window (${availableSlotsStr}).`);
        err.statusCode = 409;
        err.code = 'FACULTY_UNAVAILABLE';
        throw err;
      }
    } else if (teacherRow.status === 'Full-Time' && availabilityRows.length > 0 && !isOnline) {
      // Full-Time faculty with explicitly configured availability rules by Admin (applies to physical classes)
      const dayRows = availabilityRows.filter((entry) => {
        const entryDay = String(entry.day_of_week || '').toLowerCase();
        const targetDay = normalizedDay.toLowerCase();
        return entryDay.includes(targetDay) || targetDay.includes(entryDay);
      });

      const intervals = dayRows.map((r) => ({
        start: toMinutes(r.start_time),
        end: toMinutes(r.end_time),
      })).sort((a, b) => a.start - b.start);

      const merged = [];
      for (const iv of intervals) {
        if (merged.length === 0) {
          merged.push({ ...iv });
        } else {
          const prev = merged[merged.length - 1];
          if (iv.start <= prev.end) {
            prev.end = Math.max(prev.end, iv.end);
          } else {
            merged.push({ ...iv });
          }
        }
      }

      const startMin = toMinutes(start);
      const endMin = toMinutes(end);
      const matchesWindow = merged.some((m) => m.start <= startMin && m.end >= endMin);

      if (!matchesWindow) {
        const availableSlotsStr = availabilityRows
          .map((r) => `${r.day_of_week} ${String(r.start_time).slice(0, 5)}-${String(r.end_time).slice(0, 5)}`)
          .join(', ');
        const err = new Error(`The requested schedule (${normalizedDay} ${start}-${end}) falls outside Full-Time instructor ${teacherRow.name}'s configured availability window (${availableSlotsStr}).`);
        err.statusCode = 409;
        err.code = 'FACULTY_UNAVAILABLE';
        throw err;
      }
    }
  }

  // 8. Timetable Overlap Conflicts (Room, Faculty, Section)
  const existingRows = await query(
    `SELECT id, day, start_time, end_time, section_id, faculty_id, room_number, subject_code
     FROM schedules
     WHERE id != ?
     ORDER BY start_time ASC`,
    [id || 0],
  );

  for (const row of existingRows) {
    if (String(row.day).toLowerCase() !== normalizedDay.toLowerCase()) continue;
    if (!timesOverlap(start, end, row.start_time, row.end_time || row.start_time)) continue;

    if (!isOnline && room_number && row.room_number && String(row.room_number) === String(room_number)) {
      const err = new Error(`Room ${room_number} is already booked on ${normalizedDay} for an overlapping class (${String(row.start_time).slice(0, 5)}-${String(row.end_time).slice(0, 5)}).`);
      err.statusCode = 409;
      err.code = 'ROOM_CONFLICT';
      throw err;
    }

    if (faculty_id && row.faculty_id && String(row.faculty_id) === String(faculty_id)) {
      const err = new Error(`Faculty member ${teacherRow ? teacherRow.name : faculty_id} is already assigned to another class on ${normalizedDay} (${String(row.start_time).slice(0, 5)}-${String(row.end_time).slice(0, 5)}).`);
      err.statusCode = 409;
      err.code = 'FACULTY_CONFLICT';
      throw err;
    }

    if (section_id && row.section_id && Number(row.section_id) === Number(section_id)) {
      const err = new Error(`Section ${sectionRow ? `${sectionRow.course_code} ${sectionRow.year_level}-${sectionRow.section_label}` : section_id} already has a class scheduled on ${normalizedDay} (${String(row.start_time).slice(0, 5)}-${String(row.end_time).slice(0, 5)}).`);
      err.statusCode = 409;
      err.code = 'SECTION_CONFLICT';
      throw err;
    }
  }

  return {
    day: normalizedDay,
    start,
    end,
    subjectRow,
    teacherRow,
    roomRow,
    sectionRow,
  };
}

async function listSchedules({ user, department, facultyId, program } = {}) {
  let sql = `SELECT sc.id, sc.day,
            sc.start_time,
            sc.end_time,
            sc.subject_code,
            COALESCE(sub.name, sc.subject_code) AS subject_name,
            sub.program_code,
            sub.lab_hours,
            sub.lecture_hours,
            sc.faculty_id,
            COALESCE(t.name, '') AS faculty_name,
            t.status AS faculty_status,
            sc.room_number,
            COALESCE(r.building, 'College Building') AS building,
            r.type AS room_type,
            r.capacity AS room_capacity,
            sc.color,
            sc.section_id,
            COALESCE(CONCAT(sec.course_code, ' ', sec.year_level, '-', sec.section_label), '') AS section_name,
            sec.course_code AS section_course_code,
            sec.year_level AS year_level,
            sec.students AS section_students,
            sem.name AS semester_name,
            ay.name AS academic_year_name
     FROM schedules sc
     LEFT JOIN subjects sub ON sub.code = sc.subject_code
     LEFT JOIN teachers t ON t.id = sc.faculty_id
     LEFT JOIN rooms r ON r.number = sc.room_number
     LEFT JOIN sections sec ON sec.id = sc.section_id
     LEFT JOIN semesters sem ON sem.id = sc.semester_id
     LEFT JOIN academic_years ay ON ay.id = sc.academic_year_id`;

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
      orConds.push('sc.faculty_id = ?');
      params.push(teacherId);
    }
    if (teacherName) {
      orConds.push('LOWER(TRIM(t.name)) = ?');
      params.push(teacherName.trim().toLowerCase());
    }

    if (orConds.length > 0) {
      conditions.push(`(${orConds.join(' OR ')})`);
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
    if (progCodes.length === 0 && user?.program) {
      progCodes.push(user.program);
    }
    if (progCodes.length === 0 && user?.programCode) {
      progCodes.push(user.programCode);
    }
    progCodes = [...new Set(progCodes)];

    const orConds = [];
    if (progCodes.length > 0) {
      const placeholders = progCodes.map(() => '?').join(',');
      orConds.push(`(sub.program_code IN (${placeholders}) OR sec.course_code IN (SELECT code FROM courses WHERE program_code IN (${placeholders})) OR sec.course_code IN (${placeholders}))`);
      params.push(...progCodes, ...progCodes, ...progCodes);
    }

    const teacherId = user?.teacherId || null;
    const teacherName = user?.name || null;
    if (teacherId) {
      orConds.push('sc.faculty_id = ?');
      params.push(teacherId);
    }
    if (teacherName) {
      orConds.push('LOWER(TRIM(t.name)) = ?');
      params.push(teacherName.trim().toLowerCase());
    }

    if (orConds.length > 0) {
      conditions.push(`(${orConds.join(' OR ')})`);
    }
  } else {
    if (facultyId) {
      conditions.push('sc.faculty_id = ?');
      params.push(facultyId);
    }
    const filterProg = department || program;
    if (filterProg) {
      conditions.push('(sub.program_code = ? OR sec.course_code = ?)');
      params.push(filterProg, filterProg);
    }
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  sql += ' ORDER BY sc.day ASC, sc.start_time ASC';
  const rows = await query(sql, params);

  return rows.map((s) => {
    const startTimeStr = String(s.start_time || '').slice(0, 5);
    const endTimeStr = String(s.end_time || '').slice(0, 5);
    const timeRange = startTimeStr && endTimeStr ? `${startTimeStr}-${endTimeStr}` : (startTimeStr || '08:00-09:30');

    let yl = s.year_level ? String(s.year_level) : '';
    if (yl && !yl.includes('Year')) {
      yl = `${yl}${yl === '1' ? 'st' : yl === '2' ? 'nd' : yl === '3' ? 'rd' : 'th'} Year`;
    }

    const defaultClassMode =
      Number(s.lab_hours || 0) > 0 || String(s.room_type || '').toLowerCase().includes('lab')
        ? 'Laboratory'
        : 'Lecture';

    const isOnlineModality =
      !s.room_number ||
      String(s.room_number).toLowerCase().includes('virtual') ||
      String(s.building || '').toLowerCase().includes('virtual');
    const resolvedModality = isOnlineModality ? 'Online' : 'Face-to-Face';

    return {
      id: String(s.id),
      day: s.day,
      time: timeRange,
      startTime: s.start_time,
      endTime: s.end_time,
      subjectCode: s.subject_code || '',
      subject: s.subject_name || s.subject_code || '',
      section: s.section_name || '',
      sectionId: s.section_id ? String(s.section_id) : '',
      faculty: s.faculty_name || '',
      facultyId: s.faculty_id || '',
      room: isOnlineModality ? (s.room_number || 'Virtual Room') : (s.room_number || ''),
      building: isOnlineModality ? 'Virtual Classroom' : (s.building || 'College Building'),
      roomType: isOnlineModality ? 'Online' : (s.room_type || 'Lecture'),
      classMode: isOnlineModality ? 'Online' : defaultClassMode,
      yearLevel: yl || '1st Year',
      program: s.section_course_code || s.program_code || 'BSIT',
      course: s.section_course_code || s.program_code || 'BSIT',
      semester: s.semester_name || '1st Semester',
      academicYear: s.academic_year_name || '2026-2027',
      modality: resolvedModality,
      color: isOnlineModality ? '#059669' : (s.color || '#2563eb'),
      status: 'Confirmed'
    };
  });
}

async function resolveScheduleFKs({ subjectCode, facultyId, faculty, roomNumber, sectionId, section }) {
  let validSubjectCode = subjectCode;
  if (subjectCode) {
    const [sRow] = await query('SELECT code FROM subjects WHERE code = ? LIMIT 1', [subjectCode]);
    if (sRow) {
      validSubjectCode = sRow.code;
    }
  }

  let validFacultyId = null;
  if (facultyId && typeof facultyId === 'string' && facultyId.trim()) {
    const [tRow] = await query('SELECT id FROM teachers WHERE id = ? LIMIT 1', [facultyId.trim()]);
    if (tRow) validFacultyId = tRow.id;
  }
  if (!validFacultyId && faculty && typeof faculty === 'string' && faculty.trim()) {
    const [tRow] = await query('SELECT id FROM teachers WHERE name = ? OR name LIKE ? LIMIT 1', [faculty.trim(), `%${faculty.trim()}%`]);
    if (tRow) validFacultyId = tRow.id;
  }

  let validRoomNumber = null;
  if (roomNumber && typeof roomNumber === 'string' && roomNumber.trim()) {
    const isVirtual = String(roomNumber).toLowerCase().includes('virtual') || roomNumber === 'Virtual Room';
    if (isVirtual) {
      validRoomNumber = 'Virtual Room';
    } else {
      const [rRow] = await query('SELECT number FROM rooms WHERE number = ? OR number LIKE ? LIMIT 1', [roomNumber.trim(), `%${roomNumber.trim()}%`]);
      if (rRow) validRoomNumber = rRow.number;
    }
  }

  let validSectionId = sectionId ? Number(sectionId) : null;
  if (!validSectionId && section) {
    const trimmedSec = String(section).trim();
    const [secRow] = await query(
      `SELECT id FROM sections 
       WHERE CONCAT(course_code, ' ', year_level, '-', section_label) = ? 
          OR section_label = ? 
          OR CONCAT(course_code, ' ', year_level) = ? 
          OR CONCAT(course_code, ' ', section_label) = ?
          OR ? LIKE CONCAT('%', section_label, '%')
       ORDER BY id ASC LIMIT 1`,
      [trimmedSec, trimmedSec, trimmedSec, trimmedSec, trimmedSec]
    );
    if (secRow) validSectionId = secRow.id;
  }
  if (validSectionId) {
    const [secCheck] = await query('SELECT id FROM sections WHERE id = ? LIMIT 1', [validSectionId]);
    if (!secCheck) validSectionId = null;
  }

  return { validSubjectCode, validFacultyId, validRoomNumber, validSectionId };
}

async function createSchedule(payload, user) {
  if (user && String(user.role).toLowerCase() === 'teacher') {
    const err = new Error('Teachers have read-only access and cannot create schedules.');
    err.statusCode = 403;
    err.code = 'UNAUTHORIZED_ROLE';
    throw err;
  }

  let {
    day,
    time,
    start_time,
    end_time,
    subjectCode,
    subject_code,
    sectionId,
    section_id,
    section,
    facultyId,
    faculty_id,
    room,
    room_number,
    color,
  } = payload;

  const rawSubjectCode = subject_code || subjectCode;
  const rawRoom = room_number || room;
  const rawFacultyId = faculty_id || facultyId;
  const rawSectionId = section_id || sectionId;

  const { validSubjectCode, validFacultyId, validRoomNumber, validSectionId } = await resolveScheduleFKs({
    subjectCode: rawSubjectCode,
    facultyId: rawFacultyId,
    faculty: payload.faculty || payload.faculty_name,
    roomNumber: rawRoom,
    sectionId: rawSectionId,
    section,
  });

  let finalStart = start_time;
  let finalEnd = end_time;
  if (!finalStart && time) {
    const [st, et] = String(time).split('-').map((t) => t.trim());
    finalStart = st ? normalizeTime(st) : '08:00:00';
    finalEnd = et ? normalizeTime(et) : '09:30:00';
  } else {
    finalStart = normalizeTime(finalStart);
    finalEnd = normalizeTime(finalEnd);
  }

  const validated = await validateSchedulePayload({
    day,
    start_time: finalStart,
    end_time: finalEnd,
    subject_code: validSubjectCode,
    section_id: validSectionId,
    faculty_id: validFacultyId,
    room_number: validRoomNumber,
    modality: payload.modality || payload.classMode || (String(rawRoom || '').toLowerCase().includes('virtual') ? 'Online' : 'Face-to-Face'),
    user,
  });

  const res = await query(
    `INSERT INTO schedules (day, start_time, end_time, subject_code, section_id, faculty_id, room_number, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [validated.day, validated.start, validated.end, validSubjectCode, validSectionId, validFacultyId, validRoomNumber, color || '#2563eb']
  );

  const insertObj = Array.isArray(res) ? res[0] : res;
  const generatedId = insertObj?.insertId ? String(insertObj.insertId) : String(Date.now());

  return {
    id: generatedId,
    day: validated.day,
    time: `${validated.start.slice(0, 5)}-${validated.end.slice(0, 5)}`,
    subjectCode: validSubjectCode,
    room: validRoomNumber || rawRoom || '',
    facultyId: validFacultyId || '',
    sectionId: validSectionId ? String(validSectionId) : '',
    color: color || '#2563eb'
  };
}

async function updateSchedule(id, payload, user) {
  if (user && String(user.role).toLowerCase() === 'teacher') {
    const err = new Error('Teachers have read-only access and cannot update schedules.');
    err.statusCode = 403;
    err.code = 'UNAUTHORIZED_ROLE';
    throw err;
  }

  let {
    day,
    time,
    start_time,
    end_time,
    subjectCode,
    subject_code,
    sectionId,
    section_id,
    section,
    facultyId,
    faculty_id,
    room,
    room_number,
    color,
  } = payload;

  const rawSubjectCode = subject_code || subjectCode;
  const rawRoom = room_number || room;
  const rawFacultyId = faculty_id || facultyId;
  const rawSectionId = section_id || sectionId;

  const { validSubjectCode, validFacultyId, validRoomNumber, validSectionId } = await resolveScheduleFKs({
    subjectCode: rawSubjectCode,
    facultyId: rawFacultyId,
    faculty: payload.faculty || payload.faculty_name,
    roomNumber: rawRoom,
    sectionId: rawSectionId,
    section,
  });

  let finalStart = start_time;
  let finalEnd = end_time;
  if (!finalStart && time) {
    const [st, et] = String(time).split('-').map((t) => t.trim());
    finalStart = st ? normalizeTime(st) : '08:00:00';
    finalEnd = et ? normalizeTime(et) : '09:30:00';
  } else {
    finalStart = normalizeTime(finalStart);
    finalEnd = normalizeTime(finalEnd);
  }

  const validated = await validateSchedulePayload({
    id,
    day,
    start_time: finalStart,
    end_time: finalEnd,
    subject_code: validSubjectCode,
    section_id: validSectionId,
    faculty_id: validFacultyId,
    room_number: validRoomNumber,
    modality: payload.modality || payload.classMode || (String(rawRoom || '').toLowerCase().includes('virtual') ? 'Online' : 'Face-to-Face'),
    user,
  });

  await query(
    `UPDATE schedules SET day = ?, start_time = ?, end_time = ?, subject_code = ?, section_id = ?, faculty_id = ?, room_number = ?, color = ? WHERE id = ?`,
    [validated.day, validated.start, validated.end, validSubjectCode, validSectionId, validFacultyId, validRoomNumber, color || '#2563eb', id]
  );

  return {
    id: String(id),
    day: validated.day,
    time: `${validated.start.slice(0, 5)}-${validated.end.slice(0, 5)}`,
    subjectCode: validSubjectCode,
    room: validRoomNumber || rawRoom || '',
    facultyId: validFacultyId || '',
    sectionId: validSectionId ? String(validSectionId) : '',
    color: color || '#2563eb'
  };
}

async function deleteSchedule(id, user) {
  if (user && String(user.role).toLowerCase() === 'teacher') {
    const err = new Error('Teachers have read-only access and cannot delete schedules.');
    err.statusCode = 403;
    err.code = 'UNAUTHORIZED_ROLE';
    throw err;
  }

  const [schedRow] = await query(
    `SELECT sc.id, sub.program_code, sec.course_code
     FROM schedules sc
     LEFT JOIN subjects sub ON sub.code = sc.subject_code
     LEFT JOIN sections sec ON sec.id = sc.section_id
     WHERE sc.id = ? LIMIT 1`,
    [id]
  );

  if (!schedRow) {
    const err = new Error('Schedule not found');
    err.statusCode = 404;
    err.code = 'SCHEDULE_NOT_FOUND';
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

    const subProg = String(schedRow.program_code || '').toUpperCase();
    const secProg = String(schedRow.course_code || '').toUpperCase();

    const isAllowed = allowedPrograms.length === 0 || allowedPrograms.includes(subProg) || allowedPrograms.includes(secProg);
    if (!isAllowed) {
      const err = new Error(`Unauthorized: Program Heads can only delete schedules within their assigned program (${allowedPrograms.join(', ')}).`);
      err.statusCode = 403;
      err.code = 'UNAUTHORIZED_PROGRAM_ACCESS';
      throw err;
    }
  }

  await query('DELETE FROM schedules WHERE id = ?', [id]);
  return { message: 'Schedule deleted successfully' };
}

async function generateSchedules({ user } = {}) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = [
    { start: '08:00:00', end: '09:30:00' },
    { start: '09:30:00', end: '11:00:00' },
    { start: '10:00:00', end: '11:30:00' },
    { start: '11:00:00', end: '12:30:00' },
    { start: '13:00:00', end: '14:30:00' },
    { start: '14:30:00', end: '16:00:00' },
    { start: '16:00:00', end: '17:30:00' },
  ];

  const sections = await query('SELECT id, course_code, year_level, section_label, students FROM sections ORDER BY id ASC');
  const subjects = await query('SELECT code, name, program_code, instructor_id, lecture_hours, lab_hours FROM subjects ORDER BY code ASC');
  const rooms = await query('SELECT number, capacity, building, type FROM rooms WHERE status = "Available" OR status = "active" ORDER BY capacity ASC');
  const teachers = await query('SELECT id, name, status FROM teachers ORDER BY id ASC');

  const scheduled = [];
  const unscheduled = [];
  let conflictsAvoided = 0;

  if (sections.length === 0 || subjects.length === 0 || rooms.length === 0) {
    return {
      scheduled: [],
      unscheduled: [{ reason: 'Missing sections, subjects, or rooms in database.' }],
      conflictsAvoided: 0,
      summary: { totalRequested: 0, totalScheduled: 0, totalUnscheduled: 0, conflictsAvoided: 0 },
      allSchedules: await listSchedules({ user }),
    };
  }

  let targetSections = sections;
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

    if (allowedPrograms.length > 0) {
      targetSections = sections.filter((sec) => {
        const secCourse = String(sec.course_code || '').toUpperCase();
        return allowedPrograms.includes(secCourse) || allowedPrograms.some((p) => secCourse.includes(p));
      });
    }
  }

  let totalRequested = 0;

  for (const sec of targetSections) {
    const matchingSubjects = subjects.filter(
      (s) => !s.program_code || s.program_code === sec.course_code || sec.course_code.includes(s.program_code)
    );
    const targetSubjects = matchingSubjects.length > 0 ? matchingSubjects : subjects.slice(0, 3);

    for (const sub of targetSubjects) {
      totalRequested += 1;
      const [already] = await query('SELECT id FROM schedules WHERE section_id = ? AND subject_code = ? LIMIT 1', [sec.id, sub.code]);
      if (already) {
        continue;
      }

      const isLabSubject = Number(sub.lab_hours || 0) > 0;
      const suitableRooms = rooms.filter((r) => {
        const capacityFits = Number(r.capacity) >= Number(sec.students || 20);
        const typeFits = !isLabSubject || /lab/i.test(r.type || '') || /lab/i.test(r.building || '');
        return capacityFits && typeFits;
      });

      if (suitableRooms.length === 0) {
        unscheduled.push({
          subjectCode: sub.code,
          subjectName: sub.name,
          sectionId: sec.id,
          sectionLabel: `${sec.course_code} ${sec.year_level}-${sec.section_label}`,
          reason: isLabSubject ? 'No active laboratory room with sufficient student capacity.' : 'No active room with sufficient student capacity.',
        });
        continue;
      }

      const candidateTeachers = sub.instructor_id
        ? teachers.filter((t) => t.id === sub.instructor_id)
        : teachers;

      let classScheduled = false;

      for (const teacher of candidateTeachers) {
        if (classScheduled) break;
        const instructorId = teacher.id;

        for (const day of days) {
          if (classScheduled) break;
          for (const slot of timeSlots) {
            if (classScheduled) break;

            for (const roomToTry of suitableRooms) {
              try {
                await validateSchedulePayload({
                  day,
                  start_time: slot.start,
                  end_time: slot.end,
                  subject_code: sub.code,
                  section_id: sec.id,
                  faculty_id: instructorId,
                  room_number: roomToTry.number,
                  user,
                });

                const res = await query(
                  `INSERT INTO schedules (day, start_time, end_time, subject_code, section_id, faculty_id, room_number, color)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [day, slot.start, slot.end, sub.code, sec.id, instructorId, roomToTry.number, '#0284c7']
                );

                const insertObj = Array.isArray(res) ? res[0] : res;
                const genId = insertObj?.insertId ? String(insertObj.insertId) : String(Date.now());

                scheduled.push({
                  id: genId,
                  day,
                  time: `${slot.start.slice(0, 5)}-${slot.end.slice(0, 5)}`,
                  subjectCode: sub.code,
                  sectionId: sec.id,
                  section: `${sec.course_code} ${sec.year_level}-${sec.section_label}`,
                  room: roomToTry.number,
                  facultyId: instructorId,
                });

                classScheduled = true;
                break;
              } catch (err) {
                conflictsAvoided += 1;
                // Continue checking other rooms or slots
              }
            }
          }
        }
      }

      if (!classScheduled) {
        unscheduled.push({
          subjectCode: sub.code,
          subjectName: sub.name,
          sectionId: sec.id,
          sectionLabel: `${sec.course_code} ${sec.year_level}-${sec.section_label}`,
          reason: 'All available timetable slots result in room, instructor, or section overlap conflicts.',
        });
      }
    }
  }

  const allSchedules = await listSchedules({ user });

  return {
    scheduled,
    unscheduled,
    conflictsAvoided,
    summary: {
      totalRequested,
      totalScheduled: scheduled.length,
      totalUnscheduled: unscheduled.length,
      conflictsAvoided,
    },
    allSchedules,
  };
}

async function detectConflicts({ user } = {}) {
  let sql = `SELECT sc.id,
            sc.day,
            sc.start_time,
            sc.end_time,
            sc.room_number,
            sc.faculty_id,
            sc.section_id,
            sub.name AS subject_name,
            sub.program_code,
            sub.lab_hours,
            t.name AS faculty_name,
            t.status AS faculty_status,
            sec.course_code,
            sec.year_level,
            sec.section_label,
            sec.students AS section_students,
            r.capacity AS room_capacity,
            r.type AS room_type
     FROM schedules sc
     INNER JOIN subjects sub ON sub.code = sc.subject_code
     LEFT JOIN teachers t ON t.id = sc.faculty_id
     LEFT JOIN sections sec ON sec.id = sc.section_id
     LEFT JOIN rooms r ON r.number = sc.room_number`;

  const rows = await query(sql);
  const conflicts = [];

  // Pairwise overlap checks for complete accuracy
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i];
    const aStart = normalizeTime(a.start_time);
    const aEnd = normalizeTime(a.end_time || a.start_time);

    // 1. Check Capacity Violations
    if (a.room_number && a.room_capacity && a.section_students) {
      if (Number(a.room_capacity) < Number(a.section_students)) {
        conflicts.push({
          id: `capacity-${a.id}`,
          title: `Room Capacity Exceeded`,
          severity: 'Medium',
          detail: `Room ${a.room_number} (capacity: ${a.room_capacity}) is undersized for section ${a.course_code} ${a.year_level}-${a.section_label} (${a.section_students} students).`,
          suggestion: `Reassign to a larger lecture hall or laboratory.`,
        });
      }
    }

    // 2. Check Lab Type Violations
    if (a.room_number && Number(a.lab_hours || 0) > 0) {
      const isLab = /lab/i.test(a.room_type || '');
      if (!isLab) {
        conflicts.push({
          id: `roomtype-${a.id}`,
          title: `Room Type Mismatch`,
          severity: 'Medium',
          detail: `Subject ${a.subject_name} requires a Laboratory room, but room ${a.room_number} is configured as ${a.room_type || 'Lecture'}.`,
          suggestion: `Move to an active computer or science laboratory room.`,
        });
      }
    }

    for (let j = i + 1; j < rows.length; j++) {
      const b = rows[j];
      if (String(a.day).toLowerCase() !== String(b.day).toLowerCase()) continue;

      const bStart = normalizeTime(b.start_time);
      const bEnd = normalizeTime(b.end_time || b.start_time);

      if (!timesOverlap(aStart, aEnd, bStart, bEnd)) continue;

      // Room Conflict
      if (a.room_number && b.room_number && String(a.room_number) === String(b.room_number)) {
        conflicts.push({
          id: `room-${a.room_number}-${a.day}-${a.id}-${b.id}`,
          title: `Room ${a.room_number} Overlap`,
          severity: 'High',
          detail: `Room ${a.room_number} is booked simultaneously for "${a.subject_name}" (${a.course_code || ''} ${a.year_level || ''}-${a.section_label || ''}) and "${b.subject_name}" (${b.course_code || ''} ${b.year_level || ''}-${b.section_label || ''}) on ${a.day}.`,
          suggestion: `Assign a different room to one of the conflicting subjects.`,
        });
      }

      // Faculty Conflict
      if (a.faculty_id && b.faculty_id && String(a.faculty_id) === String(b.faculty_id)) {
        const facName = a.faculty_name || a.faculty_id;
        conflicts.push({
          id: `fac-${a.faculty_id}-${a.day}-${a.id}-${b.id}`,
          title: `Faculty Member Double Booking`,
          severity: 'High',
          detail: `${facName} is assigned to teach multiple overlapping classes on ${a.day}: "${a.subject_name}" and "${b.subject_name}".`,
          suggestion: `Reassign the instructor or move one of the classes to a different time slot.`,
        });
      }

      // Section Conflict
      if (a.section_id && b.section_id && Number(a.section_id) === Number(b.section_id)) {
        const secLabel = `${a.course_code || ''} ${a.year_level || ''}-${a.section_label || ''}`;
        conflicts.push({
          id: `sec-${a.section_id}-${a.day}-${a.id}-${b.id}`,
          title: `Section Schedule Collision`,
          severity: 'High',
          detail: `Section ${secLabel} has overlapping classes scheduled on ${a.day}: "${a.subject_name}" and "${b.subject_name}".`,
          suggestion: `Reschedule one of the subject blocks to avoid student timetable collision.`,
        });
      }
    }
  }

  return conflicts;
}

const schedulesService = {
  listSchedules,
  generateSchedules,
  detectConflicts,
  createSchedule,
  deleteSchedule,
  updateSchedule,
  validateSchedulePayload,
  timesOverlap,
};

module.exports = { schedulesService };

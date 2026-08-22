const { query } = require('../utils/db');

function normalizeTime(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (/^\d{1,2}:\d{2}$/.test(str)) return str;
  return `${str.padStart(2, '0')}:00`;
}

function toMinutes(value) {
  const [hour, minute = '0'] = String(value || '00:00').split(':').map(Number);
  return hour * 60 + minute;
}

function timesOverlap(startA, endA, startB, endB) {
  if (!startA || !endA || !startB || !endB) return false;
  const aStart = toMinutes(startA);
  const aEnd = toMinutes(endA);
  const bStart = toMinutes(startB);
  const bEnd = toMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
}

function parseAvailabilityRanges(raw) {
  if (!raw) return [];
  const rows = [];
  const parts = String(raw).split(/[|;]/).map((segment) => segment.trim()).filter(Boolean);
  for (const part of parts) {
    const match = part.match(/([A-Za-z]+)\s*[:=]\s*(\d{1,2}(?::\d{2})?)-?(\d{1,2}(?::\d{2})?)/i);
    if (!match) continue;
    const day = match[1].toLowerCase();
    const start = normalizeTime(match[2]);
    const end = normalizeTime(match[3]);
    rows.push({ day, start, end });
  }
  return rows;
}

async function validateSchedulePayload({ id = null, day, start_time, end_time, subject_code, section_id, faculty_id, room_number }) {
  const start = normalizeTime(start_time);
  const end = normalizeTime(end_time || '01:00');
  if (!day || !start || !subject_code) {
    const err = new Error('day, start_time and subject_code are required');
    err.statusCode = 400;
    throw err;
  }

  const existingRows = await query(
    `SELECT id, day, start_time, end_time, section_id, faculty_id, room_number
     FROM schedules
     WHERE id != ?
     ORDER BY start_time ASC`,
    [id || 0],
  );

  const conflicts = [];
  for (const row of existingRows) {
    if (row.day !== day) continue;
    if (!timesOverlap(start, end, row.start_time, row.end_time || row.start_time)) continue;

    if (room_number && row.room_number && String(row.room_number) === String(room_number)) {
      conflicts.push(`Room ${room_number} is already booked on ${day} for overlapping time.`);
    }
    if (faculty_id && row.faculty_id && String(row.faculty_id) === String(faculty_id)) {
      conflicts.push('The selected teacher is already assigned to another class during this time slot.');
    }
    if (section_id && row.section_id && Number(row.section_id) === Number(section_id)) {
      conflicts.push('The selected section already has another class scheduled during this time slot.');
    }
  }

  if (conflicts.length > 0) {
    const err = new Error(conflicts[0]);
    err.statusCode = 409;
    throw err;
  }

  if (faculty_id) {
    const [teacherRow] = await query(
      `SELECT t.id, t.status
       FROM teachers t
       WHERE t.id = ? LIMIT 1`,
      [faculty_id],
    );

    if (!teacherRow) {
      const err = new Error('Selected teacher does not exist.');
      err.statusCode = 404;
      throw err;
    }

    const availabilityRows = await query(
      `SELECT day_of_week, start_time, end_time
       FROM teacher_availability
       WHERE teacher_id = ?`,
      [faculty_id],
    );

    const ranges = availabilityRows.map((entry) => ({ day: entry.day_of_week, start: entry.start_time, end: entry.end_time }));
    if (ranges.length > 0) {
      const availabilityMatch = ranges.some((entry) => {
        const normalizedDay = String(entry.day || '').toLowerCase();
        return normalizedDay.includes(day.toLowerCase()) && timesOverlap(start, end, entry.start, entry.end);
      });

      if (teacherRow.status === 'Part-Time' && !availabilityMatch) {
        // Teacher has explicit availability slots recorded and requested slot is outside
        const err = new Error(`The selected schedule falls outside ${teacherRow.name || 'instructor'}'s registered availability window.`);
        err.statusCode = 409;
        throw err;
      }
    }
  }
}

async function listSchedules({ user, department } = {}) {
  let sql = `SELECT sc.id, sc.day,
            sc.start_time,
            sc.end_time,
            sc.subject_code,
            COALESCE(sub.name, sc.subject_code) AS subject_name,
            sub.program_code,
            sc.faculty_id,
            COALESCE(t.name, '') AS faculty_name,
            sc.room_number,
            COALESCE(r.building, 'College Building') AS building,
            sc.color,
            sc.section_id,
            COALESCE(CONCAT(sec.course_code, ' ', sec.year_level, '-', sec.section_label), '') AS section_name
     FROM schedules sc
     LEFT JOIN subjects sub ON sub.code = sc.subject_code
     LEFT JOIN teachers t ON t.id = sc.faculty_id
     LEFT JOIN rooms r ON r.number = sc.room_number
     LEFT JOIN sections sec ON sec.id = sc.section_id`;
  const conditions = [];
  const params = [];

  if (department) {
    conditions.push('sub.program_code = ?');
    params.push(department);
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

    return {
      id: String(s.id),
      day: s.day,
      time: timeRange,
      subjectCode: s.subject_code || '',
      subject: s.subject_name || s.subject_code || '',
      section: s.section_name || '',
      sectionId: s.section_id ? String(s.section_id) : '',
      faculty: s.faculty_name || '',
      facultyId: s.faculty_id || '',
      room: s.room_number || '',
      building: s.building || 'College Building',
      modality: 'Face-to-Face',
      program: s.program_code || 'BSIT',
      color: s.color || '#2563eb',
      status: 'Confirmed'
    };
  });
}

async function resolveScheduleFKs({ subjectCode, facultyId, roomNumber, sectionId, section }) {
  let validSubjectCode = subjectCode;
  if (subjectCode) {
    const [sRow] = await query('SELECT code FROM subjects WHERE code = ? LIMIT 1', [subjectCode]);
    if (sRow) {
      validSubjectCode = sRow.code;
    } else {
      const [fallbackSub] = await query('SELECT code FROM subjects LIMIT 1');
      if (fallbackSub) validSubjectCode = fallbackSub.code;
    }
  }

  let validFacultyId = null;
  if (facultyId && typeof facultyId === 'string' && facultyId.trim()) {
    const [tRow] = await query('SELECT id FROM teachers WHERE id = ? LIMIT 1', [facultyId.trim()]);
    if (tRow) validFacultyId = tRow.id;
  }

  let validRoomNumber = null;
  if (roomNumber && typeof roomNumber === 'string' && roomNumber.trim()) {
    const [rRow] = await query('SELECT number FROM rooms WHERE number = ? LIMIT 1', [roomNumber.trim()]);
    if (rRow) validRoomNumber = rRow.number;
  }

  let validSectionId = sectionId ? Number(sectionId) : null;
  if (!validSectionId && section) {
    const [secRow] = await query(
      "SELECT id FROM sections WHERE CONCAT(course_code, ' ', year_level, '-', section_label) = ? OR section_label = ? OR CONCAT(course_code, ' ', year_level) = ? LIMIT 1",
      [section, section, section]
    );
    if (secRow) validSectionId = secRow.id;
  }
  if (validSectionId) {
    const [secCheck] = await query('SELECT id FROM sections WHERE id = ? LIMIT 1', [validSectionId]);
    if (!secCheck) validSectionId = null;
  }

  return { validSubjectCode, validFacultyId, validRoomNumber, validSectionId };
}

async function createSchedule(payload) {
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
    roomNumber: rawRoom,
    sectionId: rawSectionId,
    section,
  });

  let finalStart = start_time;
  let finalEnd = end_time;
  if (!finalStart && time) {
    const [st, et] = String(time).split('-').map(t => t.trim());
    finalStart = st ? (/^\d{1,2}:\d{2}$/.test(st) ? `${st}:00` : st) : '08:00:00';
    finalEnd = et ? (/^\d{1,2}:\d{2}$/.test(et) ? `${et}:00` : et) : '09:30:00';
  }

  await validateSchedulePayload({
    day,
    start_time: finalStart,
    end_time: finalEnd,
    subject_code: validSubjectCode,
    section_id: validSectionId,
    faculty_id: validFacultyId,
    room_number: validRoomNumber
  });

  const res = await query(
    `INSERT INTO schedules (day, start_time, end_time, subject_code, section_id, faculty_id, room_number, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [day, finalStart, finalEnd || null, validSubjectCode, validSectionId, validFacultyId, validRoomNumber, color || '#2563eb']
  );

  const insertObj = Array.isArray(res) ? res[0] : res;
  const generatedId = insertObj?.insertId ? String(insertObj.insertId) : String(Date.now());

  return {
    id: generatedId,
    day,
    time: `${String(finalStart).slice(0,5)}-${String(finalEnd).slice(0,5)}`,
    subjectCode: validSubjectCode,
    room: validRoomNumber || rawRoom || '',
    facultyId: validFacultyId || '',
    sectionId: validSectionId ? String(validSectionId) : '',
    color: color || '#2563eb'
  };
}

async function deleteSchedule(id) {
  await query('DELETE FROM schedules WHERE id = ?', [id]);
}

async function updateSchedule(id, payload) {
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
    roomNumber: rawRoom,
    sectionId: rawSectionId,
    section,
  });

  let finalStart = start_time;
  let finalEnd = end_time;
  if (!finalStart && time) {
    const [st, et] = String(time).split('-').map(t => t.trim());
    finalStart = st ? (/^\d{1,2}:\d{2}$/.test(st) ? `${st}:00` : st) : '08:00:00';
    finalEnd = et ? (/^\d{1,2}:\d{2}$/.test(et) ? `${et}:00` : et) : '09:30:00';
  }

  await validateSchedulePayload({
    id,
    day,
    start_time: finalStart,
    end_time: finalEnd,
    subject_code: validSubjectCode,
    section_id: validSectionId,
    faculty_id: validFacultyId,
    room_number: validRoomNumber
  });

  await query(
    `UPDATE schedules SET day = ?, start_time = ?, end_time = ?, subject_code = ?, section_id = ?, faculty_id = ?, room_number = ?, color = ? WHERE id = ?`,
    [day, finalStart, finalEnd || null, validSubjectCode, validSectionId, validFacultyId, validRoomNumber, color || '#2563eb', id]
  );

  return {
    id: String(id),
    day,
    time: `${String(finalStart).slice(0,5)}-${String(finalEnd).slice(0,5)}`,
    subjectCode: validSubjectCode,
    room: validRoomNumber || rawRoom || '',
    facultyId: validFacultyId || '',
    sectionId: validSectionId ? String(validSectionId) : '',
    color: color || '#2563eb'
  };
}

async function generateSchedules() {
  return [];
}

async function detectConflicts() {
  const rows = await query(
    `SELECT sc.day,
            sc.start_time,
            sc.room_number,
            sc.faculty_id,
            sc.section_id,
            sub.name AS subject_name,
            t.name AS faculty_name,
            sec.course_code,
            sec.year_level,
            sec.section_label
     FROM schedules sc
     INNER JOIN subjects sub ON sub.code = sc.subject_code
     LEFT JOIN teachers t ON t.id = sc.faculty_id
     LEFT JOIN sections sec ON sec.id = sc.section_id`
  );

  const conflicts = [];
  const slots = new Map();
  for (const row of rows) {
    const key = `${row.day}|${row.start_time}`;
    if (!slots.has(key)) {
      slots.set(key, []);
    }
    slots.get(key).push(row);
  }

  for (const [key, list] of slots.entries()) {
    const [day, time] = key.split('|');
    const roomMap = new Map();
    const facultyMap = new Map();
    const sectionMap = new Map();

    for (const item of list) {
      if (item.room_number) {
        if (!roomMap.has(item.room_number)) roomMap.set(item.room_number, []);
        roomMap.get(item.room_number).push(item);
      }
      if (item.faculty_id) {
        if (!facultyMap.has(item.faculty_id)) facultyMap.set(item.faculty_id, []);
        facultyMap.get(item.faculty_id).push(item);
      }
      if (item.section_id) {
        if (!sectionMap.has(item.section_id)) sectionMap.set(item.section_id, []);
        sectionMap.get(item.section_id).push(item);
      }
    }

    for (const [room, items] of roomMap.entries()) {
      if (items.length > 1) {
        const subjectsList = items.map(i => `${i.subject_name} (${i.course_code} ${i.year_level}-${i.section_label})`).join(' and ');
        conflicts.push({
          title: `Room ${room} Overlap`,
          severity: 'High',
          detail: `Room ${room} is booked for multiple classes (${subjectsList}) on ${day} at ${time}.`,
          suggestion: `Assign a different room to one of the conflicting subjects.`
        });
      }
    }

    for (const [facId, items] of facultyMap.entries()) {
      if (items.length > 1) {
        const facName = items[0].faculty_name || facId;
        const subjectsList = items.map(i => `${i.subject_name} (${i.course_code} ${i.year_level}-${i.section_label})`).join(' and ');
        conflicts.push({
          title: `Faculty Member Double Booking`,
          severity: 'High',
          detail: `${facName} is assigned to teach multiple classes (${subjectsList}) on ${day} at ${time}.`,
          suggestion: `Reassign the instructor or move one of the classes to a different slot.`
        });
      }
    }

    for (const [secId, items] of sectionMap.entries()) {
      if (items.length > 1) {
        const secLabel = `${items[0].course_code} ${items[0].year_level}-${items[0].section_label}`;
        const subjectsList = items.map(i => i.subject_name).join(' and ');
        conflicts.push({
          title: `Section Schedule Collision`,
          severity: 'High',
          detail: `Section ${secLabel} has overlapping classes (${subjectsList}) scheduled on ${day} at ${time}.`,
          suggestion: `Reschedule one of the subject blocks.`
        });
      }
    }
  }

  return conflicts;
}

const schedulesService = { listSchedules, generateSchedules, detectConflicts, createSchedule, deleteSchedule, updateSchedule };
module.exports = { schedulesService };


const { query } = require('../utils/db');

async function listSchedules({ user, department } = {}) {
  // Frontend ScheduleItem expects:
  // { day, time, subject, faculty, room, color }
  let sql = `SELECT sc.id, sc.day,
            sc.start_time,
            sub.name AS subject,
            COALESCE(f.name, '') AS faculty,
            sc.room_number,
            sc.color
     FROM schedules sc
     INNER JOIN subjects sub ON sub.code = sc.subject_code
     LEFT JOIN faculty f ON f.id = sc.faculty_id`;
  const conditions = [];
  const params = [];

  if (department) {
    conditions.push('sub.department = ?');
    params.push(department);
  }

  if (user?.role === 'teacher') {
    const [facultyRow] = await query(
      'SELECT id FROM faculty WHERE email = ? LIMIT 1',
      [user.email],
    );
    if (facultyRow && facultyRow.id) {
      conditions.push('sc.faculty_id = ?');
      params.push(facultyRow.id);
    } else {
      return [];
    }
  }

  if (user?.role === 'student') {
    const [studentRow] = await query(
      'SELECT section_id FROM students WHERE user_id = ? LIMIT 1',
      [user.sub],
    );
    if (studentRow && studentRow.section_id) {
      conditions.push('sc.section_id = ?');
      params.push(studentRow.section_id);
    } else {
      return [];
    }
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  sql += ' ORDER BY sc.day ASC, sc.start_time ASC';
  const rows = await query(sql, params);

  return rows.map((s) => ({
    id: s.id,
    day: s.day,
    time: s.start_time,
    subject: s.subject,
    faculty: s.faculty,
    room: s.room_number || '',
    color: s.color || '#2563eb',
  }));
}

async function createSchedule({ day, start_time, end_time, subject_code, section_id, faculty_id, room_number, color }) {
  const res = await query(
    `INSERT INTO schedules (day, start_time, end_time, subject_code, section_id, faculty_id, room_number, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [day, start_time, end_time || null, subject_code, section_id || null, faculty_id || null, room_number || null, color || '#2563eb']
  );
  // return created row id
  return { id: res.insertId, day, time: start_time, subject: subject_code, room: room_number || '', color: color || '#2563eb' };
}

async function deleteSchedule(id) {
  await query('DELETE FROM schedules WHERE id = ?', [id]);
}

async function updateSchedule(id, { day, start_time, end_time, subject_code, room_number, color }) {
  await query('UPDATE schedules SET day = ?, start_time = ?, end_time = ?, subject_code = ?, room_number = ?, color = ? WHERE id = ?', [day, start_time, end_time || null, subject_code, room_number || null, color || '#2563eb', id]);
  return { id, day, time: start_time, subject: subject_code, room: room_number || '', color: color || '#2563eb' };
}

async function generateSchedules() {
  // Simple round-robin generator for demo purposes.
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const times = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];

  const subjects = await query('SELECT code, instructor_id, lecture_hours, lab_hours FROM subjects');
  const rooms = await query('SELECT number, capacity FROM rooms');
  const faculty = await query('SELECT id, availability FROM faculty');
  const sections = await query('SELECT id, students FROM sections');

  if (!subjects.length || !rooms.length || !faculty.length || !sections.length) {
    return [];
  }

  // Build schedule rows while avoiding double-booking and respecting room capacity.
  const inserts = [];
  // Track taken slots: key = `${day}|${time}` -> { rooms: Set, faculty: Set, sections: Set }
  const taken = new Map();

  function slotKey(day, time) {
    return `${day}|${time}`;
  }

  // Helper: parse availability strings like "Mon:08-12, Tue:13-16" (permissive)
  function parseAvailability(av) {
    if (!av) return null;
    const map = new Map();
    const parts = String(av).split(/[;,|]/).map((s) => s.trim()).filter(Boolean);
    for (const p of parts) {
      const m = p.match(/([A-Za-z]+)[:=\s]+(\d{1,2}(?::\d{2})?)-(\d{1,2}(?::\d{2})?)/);
      if (!m) continue;
      let day = m[1];
      const start = m[2].includes(':') ? m[2] : `${String(m[2]).padStart(2,'0')}:00`;
      const end = m[3].includes(':') ? m[3] : `${String(m[3]).padStart(2,'0')}:00`;
      // normalize day names
      const dayMap = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
      day = dayMap[day.slice(0,3)] || day;
      if (!map.has(day)) map.set(day, []);
      map.get(day).push([start, end]);
    }
    return map;
  }

  function timeInRanges(time, ranges) {
    if (!ranges || !ranges.length) return false;
    // time like '08:00'
    const [th, tm] = time.split(':').map(Number);
    const tmins = th * 60 + (tm || 0);
    for (const r of ranges) {
      const [s, e] = r;
      const [sh, sm] = s.split(':').map(Number);
      const [eh, em] = e.split(':').map(Number);
      const smins = sh * 60 + (sm || 0);
      const emins = eh * 60 + (em || 0);
      if (tmins >= smins && tmins < emins) return true;
    }
    return false;
  }

  // Pre-parse faculty availability
  const facultyAvailability = new Map();
  for (const f of faculty) {
    facultyAvailability.set(f.id, parseAvailability(f.availability));
  }

  for (let i = 0; i < subjects.length; i++) {
    const subj = subjects[i];
    const section = sections[i % sections.length];

    const requiredSlots = Math.max(1, Number(subj.lecture_hours || 0) + Number(subj.lab_hours || 0));

    // Determine preferred faculty
    let preferredFaculty = null;
    if (subj.instructor_id) {
      const found = faculty.find((f) => f.id === subj.instructor_id);
      if (found) preferredFaculty = found.id;
    }

    // allocate requiredSlots slots for this subject
    let slotsAssigned = 0;
    for (let attemptDay = 0; attemptDay < days.length && slotsAssigned < requiredSlots; attemptDay++) {
      for (let attemptTime = 0; attemptTime < times.length && slotsAssigned < requiredSlots; attemptTime++) {
        const day = days[attemptDay];
        const time = times[attemptTime];
        const key = slotKey(day, time);
        if (!taken.has(key)) taken.set(key, { rooms: new Set(), faculty: new Set(), sections: new Set() });
        const state = taken.get(key);

        if (state.sections.has(String(section.id))) continue;

        // pick faculty candidate considering availability
        const tryFaculty = (fId) => {
          if (!fId) return false;
          if (state.faculty.has(String(fId))) return false;
          const av = facultyAvailability.get(fId);
          if (av && av.size > 0) {
            const ranges = av.get(day);
            if (!timeInRanges(time, ranges)) return false;
          }
          return true;
        };

        let facCandidate = null;
        if (preferredFaculty && tryFaculty(preferredFaculty)) {
          facCandidate = preferredFaculty;
        } else {
          const availableFac = faculty.find((f) => tryFaculty(f.id));
          if (availableFac) facCandidate = availableFac.id;
        }
        if (!facCandidate) continue;

        // find suitable room
        const roomCandidate = rooms.find((r) => {
          const cap = Number(r.capacity) || 0;
          const students = Number(section.students) || 0;
          return cap >= students && !state.rooms.has(r.number);
        });
        if (!roomCandidate) continue;

        // assign slot
        inserts.push([
          day,
          time,
          null,
          subj.code,
          section.id,
          facCandidate,
          roomCandidate.number,
          '#2563eb',
        ]);

        state.sections.add(String(section.id));
        state.faculty.add(String(facCandidate));
        state.rooms.add(String(roomCandidate.number));
        slotsAssigned++;
      }
    }
    // if slotsAssigned < requiredSlots we leave partial assignment
  }

  // Replace existing schedules with generated ones.
  await query('DELETE FROM schedules');

  if (inserts.length === 0) return [];

  const placeholders = inserts.map(() => '(?,?,?,?,?,?,?,?)').join(',');
  const flat = inserts.flat();
  await query(
    `INSERT INTO schedules (day, start_time, end_time, subject_code, section_id, faculty_id, room_number, color) VALUES ${placeholders}`,
    flat,
  );

  // Return the newly created rows in the frontend-friendly shape.
  const rows = await listSchedules();
  return rows;
}

async function detectConflicts() {
  const rows = await query(
    `SELECT sc.day,
            sc.start_time,
            sc.room_number,
            sc.faculty_id,
            sc.section_id,
            sub.name AS subject_name,
            f.name AS faculty_name,
            sec.course_code,
            sec.year_level,
            sec.section_label
     FROM schedules sc
     INNER JOIN subjects sub ON sub.code = sc.subject_code
     LEFT JOIN faculty f ON f.id = sc.faculty_id
     LEFT JOIN sections sec ON sec.id = sc.section_id`
  );

  const conflicts = [];

  // Group schedules by day and start_time to find collisions
  const slots = new Map(); // key = "day|time" -> Array of schedule records
  for (const row of rows) {
    const key = `${row.day}|${row.start_time}`;
    if (!slots.has(key)) {
      slots.set(key, []);
    }
    slots.get(key).push(row);
  }

  for (const [key, list] of slots.entries()) {
    const [day, time] = key.split('|');

    // Check Room conflicts
    const roomMap = new Map(); // room_number -> Array of schedules
    // Check Faculty conflicts
    const facultyMap = new Map(); // faculty_id -> Array of schedules
    // Check Section conflicts
    const sectionMap = new Map(); // section_id -> Array of schedules

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

    // Report Room conflicts
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

    // Report Faculty conflicts
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

    // Report Section conflicts
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

const schedulesService = { listSchedules, generateSchedules, detectConflicts };
// attach create/delete
schedulesService.createSchedule = createSchedule;
schedulesService.deleteSchedule = deleteSchedule;
module.exports = { schedulesService };


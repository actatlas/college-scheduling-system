const { query } = require('../utils/db');

async function listExamSchedules() {
  const rows = await query(
    `SELECT es.id,
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
     LEFT JOIN teachers t ON t.id = es.proctor_id
     ORDER BY es.exam_date ASC, es.start_time ASC`
  );

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
          : String(e.section_names).split(',').map(s => s.trim()).filter(Boolean);
      } catch {
        sections = [e.section_names];
      }
    }

    return {
      id: String(e.id),
      term: e.term,
      examDate: formattedDate,
      time: timeRange,
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

async function createExamSchedule(payload) {
  const {
    term = 'Midterm',
    examDate,
    time = '08:00-10:00',
    subjectCode,
    synchronizedSections = [],
    room,
    building = 'College Building',
    proctor,
    proctorId,
    program = 'BSIT',
    color = '#2563eb'
  } = payload;

  const [startTime, endTime] = String(time).split('-').map(t => t.trim());
  const formattedStart = startTime && /^\d{1,2}:\d{2}$/.test(startTime) ? `${startTime}:00` : '08:00:00';
  const formattedEnd = endTime && /^\d{1,2}:\d{2}$/.test(endTime) ? `${endTime}:00` : '10:00:00';
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
      color
    ]
  );

  return {
    id: String(res.insertId),
    term,
    examDate,
    time,
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

async function updateExamSchedule(id, payload) {
  const {
    term,
    examDate,
    time,
    subjectCode,
    synchronizedSections,
    room,
    building,
    proctor,
    proctorId,
    program,
    color
  } = payload;

  let formattedStart = null;
  let formattedEnd = null;
  if (time) {
    const [st, et] = String(time).split('-').map(t => t.trim());
    if (st) formattedStart = /^\d{1,2}:\d{2}$/.test(st) ? `${st}:00` : st;
    if (et) formattedEnd = /^\d{1,2}:\d{2}$/.test(et) ? `${et}:00` : et;
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
      id
    ]
  );

  return { id: String(id), ...payload };
}

async function deleteExamSchedule(id) {
  await query('DELETE FROM exam_schedules WHERE id = ?', [id]);
}

module.exports = {
  examSchedulesService: {
    listExamSchedules,
    createExamSchedule,
    updateExamSchedule,
    deleteExamSchedule,
  }
};

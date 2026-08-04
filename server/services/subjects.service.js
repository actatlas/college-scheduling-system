const { query } = require('../utils/db');

async function listSubjects(programCode) {
  let sql = `SELECT s.code, s.name, s.units, s.lecture_hours, s.lab_hours, s.semester_id, sem.name AS semester_name, s.program_code, s.instructor_id,
            COALESCE(t.name, '') AS instructor
     FROM subjects s
     LEFT JOIN teachers t ON t.id = s.instructor_id
     LEFT JOIN semesters sem ON sem.id = s.semester_id`;
  const params = [];
  if (programCode) {
    sql += ' WHERE s.program_code = ?';
    params.push(programCode);
  }
  sql += ' ORDER BY s.code ASC';
  const rows = await query(sql, params);

  return rows.map((s) => ({
    code: s.code,
    name: s.name,
    units: Number(s.units),
    lectureHours: Number(s.lecture_hours),
    labHours: Number(s.lab_hours),
    semester: s.semester_name || String(s.semester_id || ''),
    department: s.program_code || '',
    programCode: s.program_code || '',
    instructor: s.instructor,
    instructorId: s.instructor_id || '',
  }));
}

async function createSubject({ code, name, units, lectureHours, labHours, semester, department, instructorId, programCode }) {
  if (!code || !name) {
    const err = new Error('Missing required fields');
    err.code = 'MISSING_FIELDS';
    throw err;
  }
  const [semesterRow] = await query('SELECT id FROM semesters WHERE name = ? LIMIT 1', [semester || '1st Semester']);
  const [programRow] = await query('SELECT code FROM programs WHERE code = ? LIMIT 1', [programCode || department || 'ITP']);
  await query(
    `INSERT INTO subjects (code, name, units, lecture_hours, lab_hours, semester_id, program_code, instructor_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [code, name, units || 0, lectureHours || 0, labHours || 0, semesterRow?.id || null, programRow?.code || null, instructorId || null]
  );
  return { code, name, units, lectureHours, labHours, semester, department: programRow?.code || department || '', instructorId };
}

const subjectsService = { listSubjects, createSubject };
module.exports = { subjectsService };

async function deleteSubject(code) {
  await query('DELETE FROM subjects WHERE code = ?', [code]);
}

async function updateSubject(code, { name, units, lectureHours, labHours, semester, department, instructorId, programCode }) {
  const [semesterRow] = await query('SELECT id FROM semesters WHERE name = ? LIMIT 1', [semester || '1st Semester']);
  const [programRow] = await query('SELECT code FROM programs WHERE code = ? LIMIT 1', [programCode || department || 'ITP']);
  await query(
    `UPDATE subjects SET name = ?, units = ?, lecture_hours = ?, lab_hours = ?, semester_id = ?, program_code = ?, instructor_id = ? WHERE code = ?`,
    [name, units || 0, lectureHours || 0, labHours || 0, semesterRow?.id || null, programRow?.code || null, instructorId || null, code]
  );
  return { code, name, units, lectureHours, labHours, semester, department: programRow?.code || department || '', instructorId };
}

subjectsService.updateSubject = updateSubject;
subjectsService.deleteSubject = deleteSubject;


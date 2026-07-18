const { query } = require('../utils/db');

async function listSubjects(department) {
  // Match SubjectItem fields:
  // code, name, units, lectureHours, labHours, semester, department, instructor
  let sql = `SELECT s.code, s.name, s.units, s.lecture_hours, s.lab_hours, s.semester, s.department,
            COALESCE(f.name, '') AS instructor
     FROM subjects s
     LEFT JOIN faculty f ON f.id = s.instructor_id`;
  const params = [];
  if (department) {
    sql += ' WHERE s.department = ?';
    params.push(department);
  }
  sql += ' ORDER BY s.code ASC';
  const rows = await query(sql, params);

  return rows.map((s) => ({
    code: s.code,
    name: s.name,
    units: Number(s.units),
    lectureHours: Number(s.lecture_hours),
    labHours: Number(s.lab_hours),
    semester: s.semester,
    department: s.department,
    instructor: s.instructor,
  }));
}

async function createSubject({ code, name, units, lectureHours, labHours, semester, department, instructorId }) {
  if (!code || !name) {
    const err = new Error('Missing required fields');
    err.code = 'MISSING_FIELDS';
    throw err;
  }
  await query(
    `INSERT INTO subjects (code, name, units, lecture_hours, lab_hours, semester, department, instructor_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [code, name, units, lectureHours || 0, labHours || 0, semester, department, instructorId || null]
  );
  return { code, name, units, lectureHours, labHours, semester, department, instructorId };
}

const subjectsService = { listSubjects, createSubject };
module.exports = { subjectsService };

async function deleteSubject(code) {
  await query('DELETE FROM subjects WHERE code = ?', [code]);
}

async function updateSubject(code, { name, units, lectureHours, labHours, semester, department, instructorId }) {
  await query(
    `UPDATE subjects SET name = ?, units = ?, lecture_hours = ?, lab_hours = ?, semester = ?, department = ?, instructor_id = ? WHERE code = ?`,
    [name, units || 0, lectureHours || 0, labHours || 0, semester || '', department || '', instructorId || null, code]
  );
  return { code, name, units, lectureHours, labHours, semester, department, instructorId };
}

subjectsService.updateSubject = updateSubject;

// attach for controller usage
subjectsService.deleteSubject = deleteSubject;


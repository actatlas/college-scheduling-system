const { query } = require('../utils/db');

async function listSections() {
  const rows = await query(
    `SELECT s.id,
            s.course_code,
            s.year_level,
            s.section_label,
            s.adviser_id,
            COALESCE(t.name, '') AS adviser,
            s.students,
            sem.name AS semester_name,
            ay.name AS academic_year_name
     FROM sections s
     LEFT JOIN teachers t ON t.id = s.adviser_id
     LEFT JOIN semesters sem ON sem.id = s.semester_id
     LEFT JOIN academic_years ay ON ay.id = s.academic_year_id
     ORDER BY s.course_code ASC, s.section_label ASC`
  );

  return rows.map((s) => ({
    id: String(s.id),
    course: s.course_code,
    yearLevel: String(s.year_level),
    section: s.section_label,
    adviser: s.adviser,
    adviserId: s.adviser_id || '',
    students: Number(s.students),
    semester: s.semester_name || '',
    schoolYear: s.academic_year_name || '',
  }));
}

async function createSection({ courseCode, yearLevel, sectionLabel, adviserId, students, semester, schoolYear }) {
  const [semesterRow] = await query('SELECT id FROM semesters WHERE name = ? LIMIT 1', [semester || '1st Semester']);
  const [yearRow] = await query('SELECT id FROM academic_years WHERE name = ? LIMIT 1', [schoolYear || '2026-2027']);
  const result = await query(
    `INSERT INTO sections (course_code, year_level, section_label, adviser_id, students, semester_id, academic_year_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [courseCode, Number(yearLevel) || 1, sectionLabel, adviserId || null, students || 0, semesterRow?.id || null, yearRow?.id || null]
  );
  return { id: String(result.insertId), course: courseCode, yearLevel: String(yearLevel), section: sectionLabel, adviser: adviserId, students, semester, schoolYear };
}

async function updateSection(id, { courseCode, yearLevel, sectionLabel, adviserId, students, semester, schoolYear }) {
  const [semesterRow] = await query('SELECT id FROM semesters WHERE name = ? LIMIT 1', [semester || '1st Semester']);
  const [yearRow] = await query('SELECT id FROM academic_years WHERE name = ? LIMIT 1', [schoolYear || '2026-2027']);
  await query(
    `UPDATE sections 
     SET course_code = ?, year_level = ?, section_label = ?, adviser_id = ?, students = ?, semester_id = ?, academic_year_id = ?
     WHERE id = ?`,
    [courseCode, Number(yearLevel) || 1, sectionLabel, adviserId || null, students || 0, semesterRow?.id || null, yearRow?.id || null, id]
  );
  return { id, course: courseCode, yearLevel: String(yearLevel), section: sectionLabel, adviser: adviserId, students, semester, schoolYear };
}

async function deleteSection(id) {
  await query('DELETE FROM sections WHERE id = ?', [id]);
}

const sectionsService = { listSections, createSection, updateSection, deleteSection };
module.exports = { sectionsService };


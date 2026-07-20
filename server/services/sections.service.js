const { query } = require('../utils/db');

async function listSections() {
  // Frontend SectionItem expects:
  // { id, course, yearLevel, section, adviser, students, semester, schoolYear }

  const rows = await query(
    `SELECT s.id,
            s.course_code,
            s.year_level,
            s.section_label,
            s.adviser_id,
            COALESCE(f.name, '') AS adviser,
            s.students,
            s.semester,
            s.school_year
     FROM sections s
     LEFT JOIN faculty f ON f.id = s.adviser_id
     ORDER BY s.course_code ASC, s.section_label ASC`
  );

  return rows.map((s) => ({
    id: String(s.id),
    course: s.course_code,
    yearLevel: s.year_level,
    section: s.section_label,
    adviser: s.adviser,
    adviserId: s.adviser_id || '',
    students: Number(s.students),
    semester: s.semester,
    schoolYear: s.school_year,
  }));
}

async function createSection({ courseCode, yearLevel, sectionLabel, adviserId, students, semester, schoolYear }) {
  const result = await query(
    `INSERT INTO sections (course_code, year_level, section_label, adviser_id, students, semester, school_year)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [courseCode, yearLevel, sectionLabel, adviserId || null, students || 0, semester, schoolYear]
  );
  return { id: String(result.insertId), course: courseCode, yearLevel, section: sectionLabel, adviser: adviserId, students, semester, schoolYear };
}

async function updateSection(id, { courseCode, yearLevel, sectionLabel, adviserId, students, semester, schoolYear }) {
  await query(
    `UPDATE sections 
     SET course_code = ?, year_level = ?, section_label = ?, adviser_id = ?, students = ?, semester = ?, school_year = ?
     WHERE id = ?`,
    [courseCode, yearLevel, sectionLabel, adviserId || null, students || 0, semester, schoolYear, id]
  );
  return { id, course: courseCode, yearLevel, section: sectionLabel, adviser: adviserId, students, semester, schoolYear };
}

async function deleteSection(id) {
  await query('DELETE FROM sections WHERE id = ?', [id]);
}

const sectionsService = { listSections, createSection, updateSection, deleteSection };
module.exports = { sectionsService };


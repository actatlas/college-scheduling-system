const { query } = require('../utils/db');

async function listSections() {
  // Frontend SectionItem expects:
  // { course, yearLevel, section, adviser, students, semester, schoolYear }

  const rows = await query(
    `SELECT s.course_code,
            s.year_level,
            s.section_label,
            COALESCE(f.name, '') AS adviser,
            s.students,
            s.semester,
            s.school_year
     FROM sections s
     LEFT JOIN faculty f ON f.id = s.adviser_id
     ORDER BY s.course_code ASC, s.section_label ASC`
  );

  return rows.map((s) => ({
    course: s.course_code,
    yearLevel: s.year_level,
    section: s.section_label,
    adviser: s.adviser,
    students: Number(s.students),
    semester: s.semester,
    schoolYear: s.school_year,
  }));
}

async function createSection({ courseCode, yearLevel, sectionLabel, adviserId, students, semester, schoolYear }) {
  await query(
    `INSERT INTO sections (course_code, year_level, section_label, adviser_id, students, semester, school_year)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [courseCode, yearLevel, sectionLabel, adviserId || null, students || 0, semester, schoolYear]
  );
  return { course: courseCode, yearLevel, section: sectionLabel, adviser: adviserId, students, semester, schoolYear };
}

const sectionsService = { listSections, createSection };
module.exports = { sectionsService };


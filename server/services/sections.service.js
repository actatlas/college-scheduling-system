const { query } = require('../utils/db');
const { resolveUserProgramScope, isProgramMatch } = require('../utils/programScope');

async function listSections(user = null) {
  const scope = await resolveUserProgramScope(user);

  let sql = `SELECT s.id,
            s.course_code,
            s.year_level,
            s.section_label,
            s.adviser_id,
            COALESCE(t.name, '') AS adviser,
            s.students,
            sem.name AS semester_name,
            ay.name AS academic_year_name,
            c.program_code
     FROM sections s
     LEFT JOIN courses c ON c.code = s.course_code
     LEFT JOIN teachers t ON t.id = s.adviser_id
     LEFT JOIN semesters sem ON sem.id = s.semester_id
     LEFT JOIN academic_years ay ON ay.id = s.academic_year_id`;

  const params = [];
  if (scope.isProgramHead && scope.allowedProgramCodes.length > 0) {
    const placeholders = scope.allowedProgramCodes.map(() => '?').join(',');
    sql += ` WHERE (s.course_code IN (${placeholders}) OR c.program_code IN (${placeholders}))`;
    params.push(...scope.allowedProgramCodes, ...scope.allowedProgramCodes);
  }

  sql += ' ORDER BY s.course_code ASC, s.section_label ASC';
  const rows = await query(sql, params);

  const mapped = rows.map((s) => ({
    id: String(s.id),
    course: s.course_code,
    courseCode: s.course_code,
    program: s.program_code || s.course_code,
    yearLevel: String(s.year_level),
    section: s.section_label,
    adviser: s.adviser,
    adviserId: s.adviser_id || '',
    students: Number(s.students),
    semester: s.semester_name || '',
    schoolYear: s.academic_year_name || '',
  }));

  if (scope.isProgramHead) {
    return mapped.filter((s) => scope.allowedProgramCodes.some((allowed) => isProgramMatch(s.course, allowed) || isProgramMatch(s.program, allowed)));
  }

  return mapped;
}

async function resolveCourseCode(rawCourse) {
  if (!rawCourse) return 'BSIT';
  const clean = String(rawCourse).trim();
  const [exactCourse] = await query('SELECT code FROM courses WHERE code = ? LIMIT 1', [clean]);
  if (exactCourse) return exactCourse.code;

  // Check if rawCourse matches a program_code
  const [progCourse] = await query('SELECT code FROM courses WHERE program_code = ? LIMIT 1', [clean]);
  if (progCourse) return progCourse.code;

  // If missing from courses, ensure it is added with a valid program_code
  const [progRow] = await query('SELECT code FROM programs WHERE code = ? LIMIT 1', [clean]);
  const validProg = progRow?.code || 'ITP';
  try {
    await query(
      'INSERT INTO courses (code, name, program_code, year_duration) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
      [clean, `${clean} Degree Course`, validProg, 4]
    );
    return clean;
  } catch {
    const [fallback] = await query('SELECT code FROM courses LIMIT 1');
    return fallback?.code || 'BSIT';
  }
}

async function createSection(payload = {}) {
  const rawCourse = payload.courseCode || payload.course || payload.program || 'BSIT';
  const courseCode = await resolveCourseCode(rawCourse);
  const sectionLabel = payload.sectionLabel || payload.section || 'A';
  const yearLevel = Number(payload.yearLevel) || 1;
  const adviserId = payload.adviserId || null;
  const students = Number(payload.students) || 0;
  const semester = payload.semester || '1st Semester';
  const schoolYear = payload.schoolYear || '2026-2027';

  const [semesterRow] = await query('SELECT id FROM semesters WHERE name = ? LIMIT 1', [semester]);
  const [yearRow] = await query('SELECT id FROM academic_years WHERE name = ? LIMIT 1', [schoolYear]);
  const result = await query(
    `INSERT INTO sections (course_code, year_level, section_label, adviser_id, students, semester_id, academic_year_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      courseCode,
      yearLevel,
      sectionLabel,
      adviserId,
      students,
      semesterRow?.id || null,
      yearRow?.id || null,
    ]
  );
  const insertObj = Array.isArray(result) ? result[0] : result;
  const newId = String(insertObj?.insertId || result?.insertId || Date.now());
  return {
    id: newId,
    course: courseCode,
    courseCode,
    program: courseCode,
    yearLevel: String(yearLevel),
    section: sectionLabel,
    adviser: adviserId || '',
    adviserId: adviserId || '',
    students,
    semester,
    schoolYear,
  };
}

async function updateSection(id, payload = {}) {
  const rawCourse = payload.courseCode || payload.course || payload.program || 'BSIT';
  const courseCode = await resolveCourseCode(rawCourse);
  const sectionLabel = payload.sectionLabel || payload.section || 'A';
  const yearLevel = Number(payload.yearLevel) || 1;
  const adviserId = payload.adviserId || null;
  const students = Number(payload.students) || 0;
  const semester = payload.semester || '1st Semester';
  const schoolYear = payload.schoolYear || '2026-2027';

  const [semesterRow] = await query('SELECT id FROM semesters WHERE name = ? LIMIT 1', [semester]);
  const [yearRow] = await query('SELECT id FROM academic_years WHERE name = ? LIMIT 1', [schoolYear]);
  await query(
    `UPDATE sections 
     SET course_code = ?, year_level = ?, section_label = ?, adviser_id = ?, students = ?, semester_id = ?, academic_year_id = ?
     WHERE id = ?`,
    [
      courseCode,
      yearLevel,
      sectionLabel,
      adviserId,
      students,
      semesterRow?.id || null,
      yearRow?.id || null,
      id,
    ]
  );
  return {
    id,
    course: courseCode,
    courseCode,
    program: courseCode,
    yearLevel: String(yearLevel),
    section: sectionLabel,
    adviser: adviserId || '',
    adviserId: adviserId || '',
    students,
    semester,
    schoolYear,
  };
}

async function deleteSection(id) {
  await query('DELETE FROM sections WHERE id = ?', [id]);
}

const sectionsService = { listSections, createSection, updateSection, deleteSection };
module.exports = { sectionsService };



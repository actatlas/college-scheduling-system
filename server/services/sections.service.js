const { query } = require('../utils/db');
const { resolveUserProgramScope, isProgramMatch } = require('../utils/programScope');

async function listSections(user = null) {
  const scope = await resolveUserProgramScope(user);

  let sql = `SELECT s.id,
            s.program_code,
            s.major_id,
            pm.code AS major_code,
            pm.name AS major_name,
            s.year_level,
            s.section_label,
            s.section_name,
            s.adviser_id,
            COALESCE(t.name, '') AS adviser,
            s.students,
            sem.name AS semester_name,
            ay.name AS academic_year_name,
            p.name AS program_name
     FROM sections s
     LEFT JOIN programs p ON p.code = s.program_code
     LEFT JOIN program_majors pm ON pm.id = s.major_id
     LEFT JOIN teachers t ON t.id = s.adviser_id
     LEFT JOIN semesters sem ON sem.id = s.semester_id
     LEFT JOIN academic_years ay ON ay.id = s.academic_year_id`;

  const params = [];
  if (scope.isProgramHead && scope.allowedProgramCodes.length > 0) {
    const placeholders = scope.allowedProgramCodes.map(() => '?').join(',');
    sql += ` WHERE (s.program_code IN (${placeholders}) OR pm.program_code IN (${placeholders}) OR pm.code IN (${placeholders}))`;
    params.push(...scope.allowedProgramCodes, ...scope.allowedProgramCodes, ...scope.allowedProgramCodes);
  }

  sql += ' ORDER BY s.program_code ASC, s.year_level ASC, s.section_label ASC';
  const rows = await query(sql, params);

  const mapped = rows.map((s) => ({
    id: String(s.id),
    program: s.program_code || 'TEP',
    programCode: s.program_code || 'TEP',
    programName: s.program_name || '',
    majorId: s.major_id ? String(s.major_id) : undefined,
    majorCode: s.major_code || '',
    majorName: s.major_name || '',
    course: s.major_code || s.program_code || 'TEP',
    courseCode: s.major_code || s.program_code || 'TEP',
    yearLevel: String(s.year_level),
    section: s.section_label,
    sectionName: s.section_name || `${s.major_code || s.program_code} ${s.year_level}-${s.section_label}`,
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

async function createSection(payload = {}) {
  const programCode = String(payload.programCode || payload.program || 'TEP').trim();
  const majorId = payload.majorId ? Number(payload.majorId) : null;
  const sectionLabel = payload.sectionLabel || payload.section || 'A';
  const yearLevel = Number(payload.yearLevel) || 1;
  const adviserId = payload.adviserId || null;
  const students = Number(payload.students) || 0;
  const semester = payload.semester || '1st Semester';
  const schoolYear = payload.schoolYear || '2026-2027';

  let majorCode = '';
  if (majorId) {
    const [mRow] = await query('SELECT code FROM program_majors WHERE id = ? LIMIT 1', [majorId]);
    majorCode = mRow?.code || '';
  }
  const sectionName = payload.sectionName || `${majorCode || programCode} ${yearLevel}-${sectionLabel}`;

  const [semesterRow] = await query('SELECT id FROM semesters WHERE name = ? LIMIT 1', [semester]);
  const [yearRow] = await query('SELECT id FROM academic_years WHERE name = ? LIMIT 1', [schoolYear]);
  const result = await query(
    `INSERT INTO sections (program_code, major_id, section_name, year_level, section_label, adviser_id, students, semester_id, academic_year_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      programCode,
      majorId,
      sectionName,
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
    program: programCode,
    programCode,
    majorId: majorId ? String(majorId) : undefined,
    majorCode,
    course: majorCode || programCode,
    courseCode: majorCode || programCode,
    yearLevel: String(yearLevel),
    section: sectionLabel,
    sectionName,
    adviser: adviserId || '',
    adviserId: adviserId || '',
    students,
    semester,
    schoolYear,
  };
}

async function updateSection(id, payload = {}) {
  const programCode = String(payload.programCode || payload.program || 'TEP').trim();
  const majorId = payload.majorId ? Number(payload.majorId) : null;
  const sectionLabel = payload.sectionLabel || payload.section || 'A';
  const yearLevel = Number(payload.yearLevel) || 1;
  const adviserId = payload.adviserId || null;
  const students = Number(payload.students) || 0;
  const semester = payload.semester || '1st Semester';
  const schoolYear = payload.schoolYear || '2026-2027';

  let majorCode = '';
  if (majorId) {
    const [mRow] = await query('SELECT code FROM program_majors WHERE id = ? LIMIT 1', [majorId]);
    majorCode = mRow?.code || '';
  }
  const sectionName = payload.sectionName || `${majorCode || programCode} ${yearLevel}-${sectionLabel}`;

  const [semesterRow] = await query('SELECT id FROM semesters WHERE name = ? LIMIT 1', [semester]);
  const [yearRow] = await query('SELECT id FROM academic_years WHERE name = ? LIMIT 1', [schoolYear]);
  await query(
    `UPDATE sections 
     SET program_code = ?, major_id = ?, section_name = ?, year_level = ?, section_label = ?, adviser_id = ?, students = ?, semester_id = ?, academic_year_id = ?
     WHERE id = ?`,
    [
      programCode,
      majorId,
      sectionName,
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
    program: programCode,
    programCode,
    majorId: majorId ? String(majorId) : undefined,
    majorCode,
    course: majorCode || programCode,
    courseCode: majorCode || programCode,
    yearLevel: String(yearLevel),
    section: sectionLabel,
    sectionName,
    adviser: adviserId || '',
    adviserId: adviserId || '',
    students,
    semester,
    schoolYear,
  };
}

async function deleteSection(id) {
  await query('DELETE FROM sections WHERE id = ?', [id]);
  return { success: true, id };
}

const sectionsService = { listSections, createSection, updateSection, deleteSection };
module.exports = { sectionsService };

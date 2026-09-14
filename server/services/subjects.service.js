const { query } = require('../utils/db');

async function resolveForeignKeys({ instructorId, programCode, program, courseCode, department, semester }) {
  // Validate instructor ID against teachers table
  let validInstructorId = null;
  if (instructorId && typeof instructorId === 'string' && instructorId.trim()) {
    const [tRow] = await query('SELECT id FROM teachers WHERE id = ? LIMIT 1', [instructorId.trim()]);
    if (tRow && tRow.id) {
      validInstructorId = tRow.id;
    }
  }

  // Validate program code against programs table
  let validProgramCode = 'ITP';
  const targetProg = programCode || program || courseCode || department || 'ITP';
  const [pRow] = await query('SELECT code FROM programs WHERE code = ? LIMIT 1', [targetProg]);
  if (pRow && pRow.code) {
    validProgramCode = pRow.code;
  } else {
    const [fallbackProg] = await query('SELECT code FROM programs LIMIT 1');
    if (fallbackProg && fallbackProg.code) {
      validProgramCode = fallbackProg.code;
    }
  }

  // Validate semester against semesters table
  let validSemesterId = null;
  const [semRow] = await query('SELECT id FROM semesters WHERE name = ? LIMIT 1', [semester || '1st Semester']);
  if (semRow && semRow.id) {
    validSemesterId = semRow.id;
  } else {
    const [fallbackSem] = await query('SELECT id FROM semesters LIMIT 1');
    if (fallbackSem && fallbackSem.id) {
      validSemesterId = fallbackSem.id;
    }
  }

  return { validInstructorId, validProgramCode, validSemesterId };
}

const { resolveUserProgramScope, getProgramFamily, isProgramMatch } = require('../utils/programScope');

function isGeneralEducationSubject(code, programCode, name) {
  const cleanCode = String(code || '').trim().toUpperCase();
  const cleanProg = String(programCode || '').trim().toUpperCase();
  const cleanName = String(name || '').trim().toUpperCase();
  if (['ALL', 'GEN', 'GENED', 'GENERAL EDUCATION', 'UNIVERSAL'].includes(cleanProg)) return true;
  if (/^(GE|GEC|NSTP|PE|PATHFIT|RIZAL|MATH|ENG|FIL|SOC|HUM|HIST|RS|THEOLOGY|CWTS|ROTC)\b/i.test(cleanCode)) return true;
  if (/^GE[\s-]*\d+/i.test(cleanCode) || /^PE[\s-]*\d+/i.test(cleanCode) || /^NSTP[\s-]*\d+/i.test(cleanCode) || /^RS[\s-]*\d+/i.test(cleanCode) || /^PATHFIT[\s-]*\d+/i.test(cleanCode)) return true;
  if (cleanName.includes('GENERAL EDUCATION') || cleanName.includes('UNDERSTANDING THE SELF') || cleanName.includes('READINGS IN PHILIPPINE') || cleanName.includes('PURPOSIVE COMMUNICATION')) return true;
  return false;
}

async function listSubjects(programCodeOrUser, userParam = null, options = {}) {
  try {
    let user = userParam;
    let programCode = programCodeOrUser;
    if (programCodeOrUser && typeof programCodeOrUser === 'object' && ('role' in programCodeOrUser || 'id' in programCodeOrUser || 'sub' in programCodeOrUser)) {
      user = programCodeOrUser;
      programCode = null;
    }

    const role = String(user?.role || '').toLowerCase();
    const isExamQuery = options.forExam === true;

    // 1. Teachers have NO Exam Subject Palette subjects
    if (role === 'teacher' && isExamQuery) {
      return [];
    }

    // 2. Resolve Program Head assigned programs
    const scope = resolveUserProgramScope(user);
    const programHeadAllowedPrograms = scope.allowedProgramCodes;

    let sql = `SELECT s.code, s.name, s.units, s.lecture_hours, s.lab_hours, s.semester_id, sem.name AS semester_name, s.program_code, s.instructor_id,
              COALESCE(t.name, '') AS instructor
       FROM subjects s
       LEFT JOIN teachers t ON t.id = s.instructor_id
       LEFT JOIN semesters sem ON sem.id = s.semester_id`;
    const params = [];
    const cleanProgramCode = typeof programCode === 'string' && programCode.trim() ? programCode.trim() : null;

    if (role === 'program_head') {
      if (programHeadAllowedPrograms.length > 0) {
        const placeholders = programHeadAllowedPrograms.map(() => '?').join(',');
        sql += ` WHERE (s.program_code IN (${placeholders}))`;
        params.push(...programHeadAllowedPrograms);
      }
    } else if (cleanProgramCode && cleanProgramCode !== 'ALL') {
      sql += ' WHERE (s.program_code = ? OR s.program_code = "ALL" OR s.program_code = "GEN" OR s.code LIKE "GE%" OR s.code LIKE "GEC%" OR s.code LIKE "NSTP%" OR s.code LIKE "PE%" OR s.code LIKE "PATHFIT%" OR s.code LIKE ?)';
      params.push(cleanProgramCode, `%${cleanProgramCode}%`);
    }

    sql += ' ORDER BY s.code ASC';
    const rows = await query(sql, params);
    if (!Array.isArray(rows)) return [];

    const mapped = rows.map((s) => {
      const isGE = isGeneralEducationSubject(s.code, s.program_code, s.name);
      return {
        code: s.code || '',
        name: s.name || '',
        units: Number(s.units || 0),
        lectureHours: Number(s.lecture_hours || 0),
        labHours: Number(s.lab_hours || 0),
        semester: s.semester_name || String(s.semester_id || '1st Semester'),
        department: isGE ? 'General Education' : (s.program_code || ''),
        programCode: isGE ? 'ALL' : (s.program_code || ''),
        program: isGE ? 'ALL' : (s.program_code || ''),
        courseCode: s.program_code || '',
        isMajor: !isGE,
        instructorId: s.instructor_id ? String(s.instructor_id) : '',
        instructor: s.instructor || 'Unassigned',
      };
    });

    // Do not show major subjects from other programs.
    if (role === 'program_head') {
      return mapped.filter((sub) => {
        // Strict exclusion of Minor / General Education
        if (!sub.isMajor || isGeneralEducationSubject(sub.code, sub.programCode, sub.name)) {
          return false;
        }
        // Strict inclusion of ONLY subjects matching the Program Head's assigned program family
        const subProg = sub.department || sub.programCode || sub.program || '';
        return programHeadAllowedPrograms.length === 0 || programHeadAllowedPrograms.some((allowed) => isProgramMatch(subProg, allowed));
      });
    }

    return mapped;
  } catch (err) {
    console.error('[backend] listSubjects error:', err);
    return [];
  }
}

async function createSubject({ code, name, units, lectureHours, labHours, semester, department, instructorId, programCode, program, courseCode, isMajor }) {
  if (!code || !name) {
    const err = new Error('Subject code and name are required');
    err.code = 'MISSING_FIELDS';
    err.statusCode = 400;
    throw err;
  }

  const { validInstructorId, validProgramCode, validSemesterId } = await resolveForeignKeys({
    instructorId,
    programCode,
    program,
    courseCode,
    department,
    semester,
  });

  try {
    await query(
      `INSERT INTO subjects (code, name, units, lecture_hours, lab_hours, semester_id, program_code, instructor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        name,
        Number(units) || 0,
        Number(lectureHours) || 0,
        Number(labHours) || 0,
        validSemesterId,
        validProgramCode,
        validInstructorId,
      ]
    );
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      const dupErr = new Error('Subject code already exists');
      dupErr.code = 'ER_DUP_ENTRY';
      dupErr.statusCode = 400;
      throw dupErr;
    }
    console.error('[backend] createSubject DB error:', err);
    throw err;
  }

  return {
    code,
    name,
    units,
    lectureHours,
    labHours,
    semester,
    department: validProgramCode,
    instructorId: validInstructorId || '',
    courseCode: courseCode || validProgramCode,
    isMajor: isMajor !== false,
  };
}

async function deleteSubject(code) {
  // Clean up any referencing schedules and exam schedules before removing subject
  await query('DELETE FROM exam_schedules WHERE subject_code = ?', [code]).catch(() => {});
  await query('DELETE FROM schedules WHERE subject_code = ?', [code]).catch(() => {});
  await query('DELETE FROM subjects WHERE code = ?', [code]);
}

async function updateSubject(code, { name, units, lectureHours, labHours, semester, department, instructorId, programCode, program, courseCode, isMajor }) {
  const { validInstructorId, validProgramCode, validSemesterId } = await resolveForeignKeys({
    instructorId,
    programCode,
    program,
    courseCode,
    department,
    semester,
  });

  await query(
    `UPDATE subjects SET name = ?, units = ?, lecture_hours = ?, lab_hours = ?, semester_id = ?, program_code = ?, instructor_id = ? WHERE code = ?`,
    [
      name,
      Number(units) || 0,
      Number(lectureHours) || 0,
      Number(labHours) || 0,
      validSemesterId,
      validProgramCode,
      validInstructorId,
      code,
    ]
  );

  return {
    code,
    name,
    units,
    lectureHours,
    labHours,
    semester,
    department: validProgramCode,
    instructorId: validInstructorId || '',
    courseCode: courseCode || validProgramCode,
    isMajor: isMajor !== false,
  };
}

const subjectsService = {
  listSubjects,
  createSubject,
  deleteSubject,
  updateSubject,
  isGeneralEducationSubject,
  getProgramFamily,
  isProgramMatch,
};
module.exports = {
  subjectsService,
  isGeneralEducationSubject,
  getProgramFamily,
  isProgramMatch,
};


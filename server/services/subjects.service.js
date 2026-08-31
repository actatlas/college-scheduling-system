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

function isGeneralEducationSubject(code, programCode) {
  const cleanCode = String(code || '').trim().toUpperCase();
  const cleanProg = String(programCode || '').trim().toUpperCase();
  if (cleanProg === 'ALL' || cleanProg === 'GEN' || cleanProg === 'GENERAL EDUCATION') return true;
  return /^(GE|GEC|NSTP|PE|PATHFIT|RIZAL|MATH|ENG|FIL|SOC|HUM|HIST)\b/i.test(cleanCode);
}

async function listSubjects(programCode) {
  try {
    let sql = `SELECT s.code, s.name, s.units, s.lecture_hours, s.lab_hours, s.semester_id, sem.name AS semester_name, s.program_code, s.instructor_id,
              COALESCE(t.name, '') AS instructor
       FROM subjects s
       LEFT JOIN teachers t ON t.id = s.instructor_id
       LEFT JOIN semesters sem ON sem.id = s.semester_id`;
    const params = [];
    const cleanProgramCode = typeof programCode === 'string' && programCode.trim() ? programCode.trim() : null;
    if (cleanProgramCode && cleanProgramCode !== 'ALL') {
      sql += ' WHERE (s.program_code = ? OR s.program_code = "ALL" OR s.program_code = "GEN" OR s.code LIKE "GE%" OR s.code LIKE "GEC%" OR s.code LIKE "NSTP%" OR s.code LIKE "PE%" OR s.code LIKE "PATHFIT%" OR s.code LIKE ?)';
      params.push(cleanProgramCode, `%${cleanProgramCode}%`);
    }
    sql += ' ORDER BY s.code ASC';
    const rows = await query(sql, params);
    if (!Array.isArray(rows)) return [];

    return rows.map((s) => {
      const isGE = isGeneralEducationSubject(s.code, s.program_code);
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
        courseCode: isGE ? 'ALL' : (s.program_code || ''),
        isMajor: !isGE,
        instructor: s.instructor || 'Unassigned',
        instructorId: s.instructor_id || '',
      };
    });
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
  try {
    await query('DELETE FROM subjects WHERE code = ?', [code]);
  } catch (err) {
    console.error('[backend] deleteSubject error:', err);
  }
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

const subjectsService = { listSubjects, createSubject, deleteSubject, updateSubject };
module.exports = { subjectsService };

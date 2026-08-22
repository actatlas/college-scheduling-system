const { query } = require('../utils/db');

async function listCourses() {
  const rows = await query(
    `SELECT code, name, COALESCE(year_duration, '') AS year_duration, COALESCE(program_code, '') AS program_code
     FROM courses
     ORDER BY code ASC`
  );

  return rows.map((c) => ({
    code: c.code,
    name: c.name,
    year: c.year_duration,
    programCode: c.program_code,
  }));
}

async function createCourse({ code, name, year, programCode, program }) {
  const prog = programCode || program || 'ITP';
  const [pRow] = await query('SELECT code FROM programs WHERE code = ? LIMIT 1', [prog]);
  let validProg = pRow?.code || 'ITP';
  if (!pRow) {
    const [fallbackProg] = await query('SELECT code FROM programs LIMIT 1');
    if (fallbackProg) validProg = fallbackProg.code;
  }

  await query(
    'INSERT INTO courses (code, name, program_code, year_duration) VALUES (?, ?, ?, ?)',
    [code, name, validProg, Number(year) || 4]
  );
  return { code, name, year: Number(year) || 4, programCode: validProg };
}

const coursesService = { listCourses, createCourse };
module.exports = { coursesService };

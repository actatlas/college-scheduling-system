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

async function updateCourse(code, { name, year, programCode, program }) {
  const prog = programCode || program;
  const updates = [];
  const params = [];
  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (year !== undefined) {
    updates.push('year_duration = ?');
    params.push(Number(year) || 4);
  }
  if (prog !== undefined) {
    updates.push('program_code = ?');
    params.push(prog);
  }
  if (updates.length > 0) {
    params.push(code);
    await query(`UPDATE courses SET ${updates.join(', ')} WHERE code = ?`, params);
  }
  const rows = await listCourses();
  return rows.find((c) => c.code === code);
}

async function deleteCourse(code) {
  await query('DELETE FROM courses WHERE code = ?', [code]);
}

const coursesService = { listCourses, createCourse, updateCourse, deleteCourse };
module.exports = { coursesService };


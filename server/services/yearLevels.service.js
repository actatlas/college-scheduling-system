const { query } = require('../utils/db');

const ALLOWED_YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

async function listYearLevels() {
  const rows = await query(
    `SELECT yl.id, yl.program_major_id, pm.code AS program_major_code, pm.name AS program_major_name, yl.year_level
     FROM year_levels yl
     INNER JOIN program_majors pm ON pm.id = yl.program_major_id
     ORDER BY pm.name ASC, yl.year_level ASC`
  );

  return rows.map((row) => ({
    id: Number(row.id),
    programMajorId: Number(row.program_major_id),
    programMajorCode: row.program_major_code || '',
    programMajorName: row.program_major_name || '',
    yearLevel: row.year_level,
  }));
}

async function getYearLevelById(id) {
  const [row] = await query(
    `SELECT yl.id, yl.program_major_id, pm.code AS program_major_code, pm.name AS program_major_name, yl.year_level
     FROM year_levels yl
     INNER JOIN program_majors pm ON pm.id = yl.program_major_id
     WHERE yl.id = ? LIMIT 1`,
    [id]
  );

  if (!row) {
    const err = new Error('Year level not found');
    err.statusCode = 404;
    throw err;
  }

  return {
    id: Number(row.id),
    programMajorId: Number(row.program_major_id),
    programMajorCode: row.program_major_code || '',
    programMajorName: row.program_major_name || '',
    yearLevel: row.year_level,
  };
}

async function createYearLevel({ programMajorId, yearLevel }) {
  if (!programMajorId || !yearLevel) {
    const err = new Error('programMajorId and yearLevel are required');
    err.statusCode = 400;
    throw err;
  }

  if (!ALLOWED_YEAR_LEVELS.includes(yearLevel)) {
    const err = new Error('yearLevel must be one of: 1st Year, 2nd Year, 3rd Year, 4th Year, 5th Year');
    err.statusCode = 400;
    throw err;
  }

  const [majorRow] = await query('SELECT id FROM program_majors WHERE id = ? LIMIT 1', [programMajorId]);
  if (!majorRow) {
    const err = new Error('Referenced program major does not exist');
    err.statusCode = 404;
    throw err;
  }

  const [duplicate] = await query('SELECT id FROM year_levels WHERE program_major_id = ? AND year_level = ? LIMIT 1', [programMajorId, yearLevel]);
  if (duplicate) {
    const err = new Error('Year level already exists for this program major');
    err.statusCode = 409;
    throw err;
  }

  const [result] = await query(
    'INSERT INTO year_levels (program_major_id, year_level) VALUES (?, ?)',
    [programMajorId, yearLevel]
  );

  return getYearLevelById(result.insertId);
}

async function updateYearLevel(id, { programMajorId, yearLevel }) {
  const existing = await getYearLevelById(id);

  if (!programMajorId && !yearLevel) {
    const err = new Error('No fields provided for update');
    err.statusCode = 400;
    throw err;
  }

  const nextProgramMajorId = programMajorId || existing.programMajorId;
  const nextYearLevel = yearLevel || existing.yearLevel;

  if (!ALLOWED_YEAR_LEVELS.includes(nextYearLevel)) {
    const err = new Error('yearLevel must be one of: 1st Year, 2nd Year, 3rd Year, 4th Year, 5th Year');
    err.statusCode = 400;
    throw err;
  }

  const [majorRow] = await query('SELECT id FROM program_majors WHERE id = ? LIMIT 1', [nextProgramMajorId]);
  if (!majorRow) {
    const err = new Error('Referenced program major does not exist');
    err.statusCode = 404;
    throw err;
  }

  const [duplicate] = await query(
    'SELECT id FROM year_levels WHERE program_major_id = ? AND year_level = ? AND id != ? LIMIT 1',
    [nextProgramMajorId, nextYearLevel, id]
  );

  if (duplicate) {
    const err = new Error('Year level already exists for this program major');
    err.statusCode = 409;
    throw err;
  }

  await query('UPDATE year_levels SET program_major_id = ?, year_level = ? WHERE id = ?', [nextProgramMajorId, nextYearLevel, id]);
  return getYearLevelById(id);
}

async function deleteYearLevel(id) {
  const existing = await getYearLevelById(id);
  await query('DELETE FROM year_levels WHERE id = ?', [id]);
  return existing;
}

const yearLevelsService = { listYearLevels, getYearLevelById, createYearLevel, updateYearLevel, deleteYearLevel, ALLOWED_YEAR_LEVELS };
module.exports = { yearLevelsService };

const { query } = require('../utils/db');
const { resolveUserProgramScope, isProgramMatch } = require('../utils/programScope');

const ALLOWED_YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

async function listProgramMajors(user = null) {
  const rows = await query(
    `SELECT pm.id, pm.code, pm.name, pm.program_code, pm.program_head_id, p.name AS program_name, u.name AS program_head_name
     FROM program_majors pm
     LEFT JOIN programs p ON p.code = pm.program_code
     LEFT JOIN users u ON u.id = pm.program_head_id
     ORDER BY pm.name ASC`
  );

  let mapped = rows.map((row) => ({
    id: Number(row.id),
    code: row.code,
    name: row.name,
    programCode: row.program_code,
    programHeadId: row.program_head_id ? Number(row.program_head_id) : null,
    programName: row.program_name || '',
    programHeadName: row.program_head_name || '',
  }));

  if (user?.role === 'program_head') {
    const scope = resolveUserProgramScope(user);
    mapped = mapped.filter((item) => {
      if (item.programHeadId && Number(item.programHeadId) === Number(user.id)) return true;
      return scope.allowedProgramCodes.some((code) => isProgramMatch(item.programCode, code) || isProgramMatch(item.code, code));
    });
  }

  return mapped;
}

async function getProgramMajorById(id, user = null) {
  const [row] = await query(
    `SELECT pm.id, pm.code, pm.name, pm.program_code, pm.program_head_id, p.name AS program_name, u.name AS program_head_name
     FROM program_majors pm
     LEFT JOIN programs p ON p.code = pm.program_code
     LEFT JOIN users u ON u.id = pm.program_head_id
     WHERE pm.id = ? LIMIT 1`,
    [id]
  );

  if (!row) {
    const err = new Error('Program major not found');
    err.statusCode = 404;
    throw err;
  }

  const result = {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    programCode: row.program_code,
    programHeadId: row.program_head_id ? Number(row.program_head_id) : null,
    programName: row.program_name || '',
    programHeadName: row.program_head_name || '',
  };

  if (user?.role === 'program_head') {
    const scope = resolveUserProgramScope(user);
    const isOwner = result.programHeadId && Number(result.programHeadId) === Number(user.id);
    const isAllowed = scope.allowedProgramCodes.some((code) => isProgramMatch(result.programCode, code) || isProgramMatch(result.code, code));
    if (!isOwner && !isAllowed) {
      const err = new Error('Forbidden. You cannot access program majors outside your assigned program.');
      err.statusCode = 403;
      throw err;
    }
  }

  return result;
}

async function createProgramMajor({ code, name, programCode, programHeadId }) {
  if (!code || !name || !programCode) {
    const err = new Error('code, name and programCode are required');
    err.statusCode = 400;
    throw err;
  }

  const [programRow] = await query('SELECT code FROM programs WHERE code = ? LIMIT 1', [programCode]);
  if (!programRow) {
    const err = new Error('Referenced program does not exist');
    err.statusCode = 404;
    throw err;
  }

  if (programHeadId) {
    const [headRow] = await query('SELECT id FROM users WHERE id = ? AND role = ? LIMIT 1', [programHeadId, 'program_head']);
    if (!headRow) {
      const err = new Error('Referenced program head does not exist');
      err.statusCode = 404;
      throw err;
    }
  }

  const [existing] = await query('SELECT id FROM program_majors WHERE code = ? LIMIT 1', [code]);
  if (existing) {
    const err = new Error('Program major code already exists');
    err.statusCode = 409;
    throw err;
  }

  const [result] = await query(
    'INSERT INTO program_majors (code, name, program_code, program_head_id) VALUES (?, ?, ?, ?)',
    [code, name, programCode, programHeadId || null]
  );

  return getProgramMajorById(result.insertId);
}

async function updateProgramMajor(id, { code, name, programCode, programHeadId }) {
  const existing = await getProgramMajorById(id);

  if (!code && !name && !programCode && programHeadId === undefined) {
    const err = new Error('No fields provided for update');
    err.statusCode = 400;
    throw err;
  }

  const nextCode = code || existing.code;
  const nextName = name || existing.name;
  const nextProgramCode = programCode || existing.programCode;
  const nextProgramHeadId = programHeadId !== undefined ? programHeadId : existing.programHeadId;

  const [programRow] = await query('SELECT code FROM programs WHERE code = ? LIMIT 1', [nextProgramCode]);
  if (!programRow) {
    const err = new Error('Referenced program does not exist');
    err.statusCode = 404;
    throw err;
  }

  if (nextProgramHeadId) {
    const [headRow] = await query('SELECT id FROM users WHERE id = ? AND role = ? LIMIT 1', [nextProgramHeadId, 'program_head']);
    if (!headRow) {
      const err = new Error('Referenced program head does not exist');
      err.statusCode = 404;
      throw err;
    }
  }

  await query(
    'UPDATE program_majors SET code = ?, name = ?, program_code = ?, program_head_id = ? WHERE id = ?',
    [nextCode, nextName, nextProgramCode, nextProgramHeadId, id]
  );

  return getProgramMajorById(id);
}

async function deleteProgramMajor(id) {
  const existing = await getProgramMajorById(id);
  await query('DELETE FROM program_majors WHERE id = ?', [id]);
  return existing;
}

const programMajorsService = { listProgramMajors, getProgramMajorById, createProgramMajor, updateProgramMajor, deleteProgramMajor, ALLOWED_YEAR_LEVELS };
module.exports = { programMajorsService };

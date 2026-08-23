const { query } = require('../utils/db');

async function listPrograms() {
  const rows = await query(
    `SELECT code, name, COALESCE(focus, '') AS focus FROM programs ORDER BY name ASC`
  );
  return rows.map((r) => ({ id: r.code, code: r.code, name: r.name, focus: r.focus }));
}

async function createProgram({ code, name, focus }) {
  if (!code || !name) {
    const err = new Error('code and name are required');
    err.statusCode = 400;
    throw err;
  }
  await query('INSERT INTO programs (code, name, focus) VALUES (?, ?, ?)', [code, name, focus || null]);
  const rows = await listPrograms();
  return rows.find((d) => d.code === code);
}

async function updateProgram(code, { name, focus }) {
  await query('UPDATE programs SET name = COALESCE(?, name), focus = COALESCE(?, focus) WHERE code = ?', [name || null, focus || null, code]);
  const rows = await listPrograms();
  return rows.find((d) => d.code === code);
}

async function deleteProgram(code) {
  await query('DELETE FROM programs WHERE code = ?', [code]);
}

const programsService = { listPrograms, createProgram, updateProgram, deleteProgram };
module.exports = { programsService };


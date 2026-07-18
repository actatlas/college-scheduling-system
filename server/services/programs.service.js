const { query } = require('../utils/db');

async function listPrograms() {
  const rows = await query(
    `SELECT id, name, COALESCE(focus, '') AS focus FROM departments ORDER BY name ASC`
  );
  return rows.map((r) => ({ id: r.id, name: r.name, focus: r.focus }));
}

async function createProgram({ name, focus }) {
  await query('INSERT INTO departments (name, focus) VALUES (?, ?)', [name, focus || null]);
  const rows = await listPrograms();
  return rows.find((d) => d.name === name);
}

const programsService = { listPrograms, createProgram };
module.exports = { programsService };

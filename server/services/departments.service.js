const { query } = require('../utils/db');

async function listDepartments() {
  const rows = await query(
    `SELECT code, name, COALESCE(focus, '') AS focus FROM programs ORDER BY name ASC`
  );
  return rows.map((r) => ({ id: r.code, name: r.name, code: r.code, focus: r.focus }));
}

async function createDepartment({ name, code, focus }) {
  const finalCode = code || name?.slice(0, 5).toUpperCase() || 'DEPT';
  await query('INSERT INTO programs (code, name, focus) VALUES (?, ?, ?)', [finalCode, name, focus || null]);
  const rows = await listDepartments();
  return rows.find((d) => d.name === name);
}

const departmentsService = { listDepartments, createDepartment };
module.exports = { departmentsService };


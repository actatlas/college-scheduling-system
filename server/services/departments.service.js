const { query } = require('../utils/db');

async function listDepartments() {
  const rows = await query(
    `SELECT id, name, COALESCE(focus, '') AS focus FROM departments ORDER BY name ASC`
  );
  return rows.map((r) => ({ id: r.id, name: r.name, focus: r.focus }));
}

async function createDepartment({ name, focus }) {
  await query('INSERT INTO departments (name, focus) VALUES (?, ?)', [name, focus || null]);
  const rows = await listDepartments();
  return rows.find((d) => d.name === name);
}

const departmentsService = { listDepartments, createDepartment };
module.exports = { departmentsService };

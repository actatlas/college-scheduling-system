const { query } = require('../utils/db');

async function listFaculty() {
  // Return fields matching frontend FacultyMember type:
  // id, name, department, email, phone, status, availability, subjects: []
  // subjects[] are subject codes assigned via subjects.instructor_id.

  const facultyRows = await query(
    `SELECT f.id, f.name, f.department, f.email, f.phone, f.status, f.availability
     FROM faculty f
     ORDER BY f.id ASC`
  );

  if (facultyRows.length === 0) return [];

  const ids = facultyRows.map((f) => f.id);
  const inClause = ids.map(() => '?').join(',');

  const subjectRows = await query(
    `SELECT s.instructor_id AS instructor_id, s.code
     FROM subjects s
     WHERE s.instructor_id IN (${inClause})`,
    ids
  );

  const subjectMap = new Map();
  for (const row of subjectRows) {
    if (!subjectMap.has(row.instructor_id)) subjectMap.set(row.instructor_id, []);
    subjectMap.get(row.instructor_id).push(row.code);
  }

  return facultyRows.map((f) => ({
    id: String(f.id),
    name: f.name,
    department: f.department,
    email: f.email || '',
    phone: f.phone || '',
    status: f.status,
    availability: f.availability || '',
    subjects: subjectMap.get(f.id) || [],
  }));
}

async function createFaculty(payload) {
  const { id, name, department, email, phone, status, availability } = payload;
  await query(
    `INSERT INTO faculty (id, name, department, email, phone, status, availability) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, name, department, email || null, phone || null, status || 'active', availability || null]
  );
  return { id, name, department, email, phone, status, availability };
}

async function updateFaculty(id, payload) {
  const updates = [];
  const params = [];

  if (payload.availability !== undefined) {
    updates.push('availability = ?');
    params.push(payload.availability);
  }
  if (payload.status !== undefined) {
    updates.push('status = ?');
    params.push(payload.status);
  }
  if (payload.department !== undefined) {
    updates.push('department = ?');
    params.push(payload.department);
  }

  if (updates.length === 0) {
    return listFaculty();
  }

  params.push(id);
  await query(`UPDATE faculty SET ${updates.join(', ')} WHERE id = ?`, params);
  const [row] = await query('SELECT id, name, department, email, phone, status, availability FROM faculty WHERE id = ? LIMIT 1', [id]);
  return {
    id: String(row.id),
    name: row.name,
    department: row.department,
    email: row.email || '',
    phone: row.phone || '',
    status: row.status,
    availability: row.availability || '',
    subjects: [],
  };
}

const facultyService = { listFaculty, createFaculty, updateFaculty };
module.exports = { facultyService };


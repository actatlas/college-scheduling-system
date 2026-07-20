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
  const [oldFaculty] = await query('SELECT email FROM faculty WHERE id = ? LIMIT 1', [id]);

  const updates = [];
  const params = [];

  const fields = ['name', 'department', 'email', 'phone', 'status', 'availability'];
  for (const field of fields) {
    if (payload[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(payload[field]);
    }
  }

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE faculty SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  if (oldFaculty && oldFaculty.email) {
    const userUpdates = [];
    const userParams = [];
    if (payload.name !== undefined) {
      userUpdates.push('name = ?');
      userParams.push(payload.name);
    }
    if (payload.email !== undefined) {
      userUpdates.push('email = ?');
      userParams.push(payload.email);
    }
    if (userUpdates.length > 0) {
      userParams.push(oldFaculty.email);
      await query(`UPDATE users SET ${userUpdates.join(', ')} WHERE email = ?`, userParams);
    }
  }

  const [row] = await query('SELECT id, name, department, email, phone, status, availability FROM faculty WHERE id = ? LIMIT 1', [id]);
  if (!row) {
    throw new Error('Faculty member not found');
  }
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

async function deleteFaculty(id) {
  const [faculty] = await query('SELECT email FROM faculty WHERE id = ? LIMIT 1', [id]);
  if (!faculty) {
    const err = new Error('Faculty member not found');
    err.statusCode = 404;
    throw err;
  }
  
  if (faculty.email) {
    await query('DELETE FROM users WHERE email = ?', [faculty.email]);
  }
  
  await query('DELETE FROM faculty WHERE id = ?', [id]);
}

const facultyService = { listFaculty, createFaculty, updateFaculty, deleteFaculty };
module.exports = { facultyService };


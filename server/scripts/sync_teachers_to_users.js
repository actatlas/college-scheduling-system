require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('../database/pool');

function generateTeacherEmail(name, id) {
  // Normalize accented characters like ñ -> n
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const parts = normalized.split(',').map(s => s.trim());
  if (parts.length >= 2) {
    const lastName = parts[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const firstNames = parts[1].split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (lastName === 'bacomo') return 'bacomo@srcb.edu.ph';
    if (firstNames && lastName) {
      return `${firstNames}.${lastName}@srcb.edu.ph`;
    }
    return `${lastName}@srcb.edu.ph`;
  }
  const clean = normalized.toLowerCase().replace(/[^a-z0-9]/g, '.');
  return `${clean}@srcb.edu.ph`;
}

async function syncTeachersToUsers() {
  const conn = await pool.getConnection();
  try {
    console.log('=== SYNCHRONIZING TEACHERS TO USERS ===');
    await conn.beginTransaction();

    // 1. Reassign any subjects referencing placeholder dummy teachers (T-ED-001, etc.) to valid TEP faculty
    await conn.query(`UPDATE subjects SET instructor_id = 'T-ABEJ-G' WHERE instructor_id IN ('T-ED-001', 'T-ED-002', 'T-GEN-001', 'T-GEN-002')`);
    await conn.query(`DELETE FROM teacher_availability WHERE teacher_id IN ('T-ED-001', 'T-ED-002', 'T-GEN-001', 'T-GEN-002')`);
    await conn.query(`DELETE FROM teachers WHERE id IN ('T-ED-001', 'T-ED-002', 'T-GEN-001', 'T-GEN-002')`);
    await conn.query(`DELETE FROM users WHERE email IN ('johndewey-educ@srcb.edu.ph', 'levvygotsky-educ@srcb.edu.ph', 'socrates-gen@srcb.edu.ph', 'rizal-gen@srcb.edu.ph')`);

    // 2. Fetch all legitimate teachers from DB
    const [teachers] = await conn.query(`
      SELECT t.id, t.name, t.email, t.phone, t.status, pm.program_code, pm.code as major_code
      FROM teachers t
      LEFT JOIN program_majors pm ON pm.id = t.program_major_id
      ORDER BY t.name
    `);

    console.log(`Found ${teachers.length} teachers in teachers table.`);
    const defaultPasswordHash = await bcrypt.hash('@teacher123', 10);

    for (const t of teachers) {
      const email = t.email || generateTeacherEmail(t.name, t.id);
      const program = t.program_code || 'TEP';

      // Update email on teachers table
      await conn.query(`UPDATE teachers SET email = ?, phone = COALESCE(phone, '0917-000-0000') WHERE id = ?`, [email, t.id]);

      // Check if user already exists
      const [existingUser] = await conn.query(`SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`, [email]);

      if (existingUser.length > 0) {
        await conn.query(`
          UPDATE users
          SET name = ?, role = 'teacher', status = 'Active', program = ?
          WHERE id = ?
        `, [t.name, program, existingUser[0].id]);
        console.log(`Updated user account for: ${t.name} (${email})`);
      } else {
        await conn.query(`
          INSERT INTO users (name, email, password_hash, role, status, program)
          VALUES (?, ?, ?, 'teacher', 'Active', ?)
        `, [t.name, email, defaultPasswordHash, program]);
        console.log(`Created new user account for: ${t.name} (${email})`);
      }
    }

    await conn.commit();
    console.log('=== SYNC COMPLETED SUCCESSFULLY ===\n');

    // Report
    const [allUsers] = await conn.query(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.program, t.id as teacher_id
      FROM users u
      LEFT JOIN teachers t ON LOWER(t.email) = LOWER(u.email)
      ORDER BY u.role, u.name
    `);
    console.log(`Total registered users in DB: ${allUsers.length}`);
    console.table(allUsers);

  } catch (err) {
    await conn.rollback();
    console.error('Error syncing teachers to users:', err);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

syncTeachersToUsers();

require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('../database/pool');

async function run() {
  const conn = await pool.getConnection();
  try {
    // Admin user
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@srbc.edu';
    const password = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
    const name = process.env.SEED_ADMIN_NAME || 'Admin';
    const role = 'admin';

    const [existing] = await conn.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing && existing.length) {
      console.log('Admin user already exists:', email);
    } else {
      const hash = await bcrypt.hash(password, 10);
      await conn.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email, hash, role]);
      console.log('Created admin user:', email, 'password:', password);
    }

    // Sample rooms
    const rooms = [ ['R-101', 40, 'Main Building'], ['LAB-02', 24, 'Science Block'], ['R-202', 60, 'Annex'] ];
    for (const [number, capacity, building] of rooms) {
      await conn.query('INSERT IGNORE INTO rooms (number, capacity, building, type, status) VALUES (?, ?, ?, ?, ?)', [number, capacity, building, 'Lecture', 'active']);
    }

    // Sample faculty
    const faculty = [ ['F001', 'Maria Santos', 'Computer Science'], ['F002', 'Jose Cruz', 'Mathematics'], ['F003', 'Ana Reyes', 'Physics'] ];
    for (const [id, name, department] of faculty) {
      await conn.query('INSERT IGNORE INTO faculty (id, name, department, status) VALUES (?, ?, ?, ?)', [id, name, department, 'active']);
    }

    // Sample courses
    await conn.query('INSERT IGNORE INTO courses (code, name, year_duration) VALUES (?, ?, ?)', ['BSCS', 'Bachelor of Science in Computer Science', '4']);

    // Sample subjects
    await conn.query('INSERT IGNORE INTO subjects (code, name, units, lecture_hours, lab_hours, semester, department, instructor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['CS101', 'Intro to Programming', 3, 3, 0, '1', 'Computer Science', 'F001']);

    // Sample sections
    await conn.query('INSERT IGNORE INTO sections (course_code, year_level, section_label, adviser_id, students, semester, school_year) VALUES (?, ?, ?, ?, ?, ?, ?)', ['BSCS', '1', 'A', 'F001', 30, '1', '2025-2026']);

    console.log('Sample data seeded.');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

run();

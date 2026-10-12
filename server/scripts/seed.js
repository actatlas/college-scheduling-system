require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('../database/pool');

async function run() {
  const conn = await pool.getConnection();
  try {
    // 1. Clear tables (in order of child to parent)
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('TRUNCATE TABLE reset_tokens');
    await conn.query('TRUNCATE TABLE schedule_adjustment_requests');
    await conn.query('TRUNCATE TABLE exam_schedules');
    await conn.query('TRUNCATE TABLE schedules');
    await conn.query('TRUNCATE TABLE sections');
    await conn.query('TRUNCATE TABLE year_levels');
    await conn.query('TRUNCATE TABLE teachers');
    await conn.query('TRUNCATE TABLE subjects');
    await conn.query('TRUNCATE TABLE program_majors');
    await conn.query('TRUNCATE TABLE programs');
    await conn.query('TRUNCATE TABLE rooms');
    await conn.query('TRUNCATE TABLE users');
    await conn.query('TRUNCATE TABLE days');
    await conn.query('TRUNCATE TABLE semesters');
    await conn.query('TRUNCATE TABLE academic_years');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    // 2. Days (7. DAY Entity)
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const d of days) {
      await conn.query('INSERT INTO days (name) VALUES (?)', [d]);
    }

    // 3. Academic Years & Semesters (8. SEMESTER/TERM Entity)
    await conn.query('INSERT INTO academic_years (id, name, is_active) VALUES (1, "2026-2027", TRUE)');
    await conn.query('INSERT INTO semesters (id, school_year, term, name, is_active) VALUES (1, "2026-2027", "1st Semester", "1st Semester", TRUE), (2, "2026-2027", "2nd Semester", "2nd Semester", FALSE)');

    // 4. Programs (1. PROGRAM Entity)
    const programsList = [
      ['BAP', 'Business Administration Program', 'Business Administration and Management'],
      ['ITP', 'Information Technology Program', 'Information Technology and Computing'],
      ['CJEP', 'Criminal Justice Education Program', 'Criminology and Law Enforcement'],
      ['TEP', 'Teacher Education Program', 'Teacher Education and Pedagogy'],
      ['HMP', 'Hospitality Management Program', 'Hospitality and Tourism Management'],
      ['ALL', 'General Education Department', 'Institutional General Education']
    ];
    for (const [code, name, desc] of programsList) {
      await conn.query('INSERT INTO programs (code, name, description) VALUES (?, ?, ?)', [code, name, desc]);
    }

    // 5. Admin & Program Head Users (6. USER Entity)
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@srcb.edu.ph';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || '@admin123';
    const adminHash = await bcrypt.hash(adminPassword, 10);
    await conn.query('INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, "admin", "Active")', ['System Administrator', adminEmail, adminHash]);

    const programHeadEmail = 'programhead@srcb.edu.ph';
    const programHeadHash = await bcrypt.hash('@program123', 10);
    const [programHeadUser] = await conn.query('INSERT INTO users (name, email, password_hash, role, status, program) VALUES (?, ?, ?, "program_head", "Active", "ITP")', ['Dr. Reyes', programHeadEmail, programHeadHash]);

    // 6. Program Majors (2. MAJOR Entity)
    await conn.query('INSERT INTO program_majors (code, name, program_code, program_head_id) VALUES (?, ?, ?, ?)', ['BSIT', 'Bachelor of Science in Information Technology', 'ITP', programHeadUser.insertId]);
    await conn.query('INSERT INTO program_majors (code, name, program_code, program_head_id) VALUES (?, ?, ?, ?)', ['BSBA', 'Bachelor of Science in Business Administration', 'BAP', programHeadUser.insertId]);

    const [majorIT] = await conn.query('SELECT id FROM program_majors WHERE code = ? LIMIT 1', ['BSIT']);
    const [majorBA] = await conn.query('SELECT id FROM program_majors WHERE code = ? LIMIT 1', ['BSBA']);

    // 7. Year Levels
    await conn.query('INSERT INTO year_levels (program_major_id, year_level) VALUES (?, ?)', [majorIT[0].id, '1st Year']);
    await conn.query('INSERT INTO year_levels (program_major_id, year_level) VALUES (?, ?)', [majorIT[0].id, '2nd Year']);

    // 8. Faculty (5. FACULTY Entity - Not every faculty member needs a user account)
    await conn.query(
      `INSERT INTO teachers (id, employee_number, first_name, last_name, name, email, phone, position, faculty_type, program_major_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['T001', 'EMP-001', 'Maria', 'Santos', 'Santos, Maria', 'teacher@srcb.edu.ph', '0917-123-4567', 'Faculty Instructor', 'Full-Time', majorIT[0].id]
    );

    const teacherHash = await bcrypt.hash('@teacher123', 10);
    await conn.query(
      'INSERT INTO users (faculty_id, name, email, password_hash, role, status, program) VALUES (?, ?, ?, ?, "teacher", "Active", "ITP")',
      ['T001', 'Maria Santos', 'teacher@srcb.edu.ph', teacherHash]
    );

    // 9. Sections (4. SECTION/GROUP Entity)
    await conn.query(
      `INSERT INTO sections (program_code, major_id, section_name, year_level, section_label, adviser_id, students, semester_id, academic_year_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['ITP', majorIT[0].id, 'BSIT 1-A', 1, 'A', 'T001', 35, 1, 1]
    );

    const [secIT1A] = await conn.query('SELECT id FROM sections WHERE section_name = ? LIMIT 1', ['BSIT 1-A']);

    // 10. Subjects (3. SUBJECT Entity)
    await conn.query(
      `INSERT INTO subjects (code, name, subject_title, units, lecture_hours, lab_hours, subject_type, semester_id, program_code, major_id, instructor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['CS101', 'Intro to Programming', 'Introduction to Computer Programming', 3, 2, 3, 'Major', 1, 'ITP', majorIT[0].id, 'T001']
    );
    await conn.query(
      `INSERT INTO subjects (code, name, subject_title, units, lecture_hours, lab_hours, subject_type, semester_id, program_code, instructor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['GE101', 'Understanding the Self', 'Understanding the Self (Institutional GenEd)', 3, 2, 0, 'Gen Ed', 1, 'ALL', 'T001']
    );

    // 11. Rooms (9. ROOM Entity - Direct facility identity e.g. 301-COLLEGE, LAB-02-SCIENCE)
    const roomsList = [
      ['301-COLLEGE', 'College Classroom 301', 45, 'Lecture', 'active'],
      ['LAB-02-SCIENCE', 'Science & Computing Lab 02', 30, 'Laboratory', 'active'],
      ['COL-101', 'College Hall 101', 50, 'Lecture', 'active']
    ];
    for (const [number, rName, capacity, type, status] of roomsList) {
      await conn.query('INSERT INTO rooms (number, room_name, capacity, type, status) VALUES (?, ?, ?, ?, ?)', [number, rName, capacity, type, status]);
    }

    // 12. Schedules (10. SCHEDULE Entity)
    await conn.query(
      `INSERT INTO schedules (day, day_id, start_time, end_time, subject_code, section_id, faculty_id, room_number, class_mode, status, semester_id, academic_year_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Monday', 1, '08:00:00', '11:00:00', 'CS101', secIT1A[0]?.id || 1, 'T001', 'LAB-02-SCIENCE', 'Face-to-Face', 'PUBLISHED', 1, 1]
    );

    // 13. Exam Schedules (11. EXAMINATION SCHEDULE Entity)
    await conn.query(
      `INSERT INTO exam_schedules (term, exam_period, exam_date, start_time, end_time, subject_code, section_names, room_number, proctor_id, proctor_name, program_code, class_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Midterm', 'Midterm', '2026-10-15', '08:00:00', '10:00:00', 'CS101', JSON.stringify(['BSIT 1-A']), 'LAB-02-SCIENCE', 'T001', 'Maria Santos', 'ITP', 'Face-to-Face']
    );

    console.log('Sample 11-entity CDM data seeded successfully.');

  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

run();

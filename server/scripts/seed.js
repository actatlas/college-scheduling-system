require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('../database/pool');

async function run() {
  const conn = await pool.getConnection();
  try {
    // 1. Clear tables (in order of child to parent)
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('TRUNCATE TABLE reset_tokens');
    await conn.query('TRUNCATE TABLE exam_schedules');
    await conn.query('TRUNCATE TABLE schedules');
    await conn.query('TRUNCATE TABLE sections');
    await conn.query('TRUNCATE TABLE year_levels');
    await conn.query('TRUNCATE TABLE teacher_availability');
    await conn.query('TRUNCATE TABLE teachers');
    await conn.query('TRUNCATE TABLE subjects');
    await conn.query('TRUNCATE TABLE courses');
    await conn.query('TRUNCATE TABLE program_majors');
    await conn.query('TRUNCATE TABLE programs');
    await conn.query('TRUNCATE TABLE rooms');
    await conn.query('TRUNCATE TABLE users');
    await conn.query('TRUNCATE TABLE semesters');
    await conn.query('TRUNCATE TABLE academic_years');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');


    // 2. Academic Years
    await conn.query('INSERT INTO academic_years (id, name, is_active) VALUES (1, "2026-2027", TRUE)');

    // 3. Semesters
    await conn.query('INSERT INTO semesters (id, name, is_active) VALUES (1, "1st Semester", TRUE), (2, "2nd Semester", FALSE)');

    // 4. Admin, Program Head, and Teacher Users
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@srcb.edu.ph';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || '@admin123';
    const adminHash = await bcrypt.hash(adminPassword, 10);
    await conn.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, "admin")', ['System Administrator', adminEmail, adminHash]);

    const programHeadEmail = 'programhead@srcb.edu.ph';
    const programHeadHash = await bcrypt.hash('@program123', 10);
    const [programHeadUser] = await conn.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, "program_head")', ['Dr. Reyes', programHeadEmail, programHeadHash]);

    const teacherEmail = 'teacher@srcb.edu.ph';
    const teacherHash = await bcrypt.hash('@teacher123', 10);
    const [teacherUser] = await conn.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, "teacher")', ['Maria Santos', teacherEmail, teacherHash]);

    // 5. Programs (ITP, BSA, CJEP, HMP, TEP)
    const programsList = [
      ['ITP', 'Information Technology Program', 'ITP Focus'],
      ['BSA', 'Business Administration', 'BSA Focus'],
      ['CJEP', 'Criminal Justice Education Program', 'CJEP Focus'],
      ['HMP', 'Hospitality Management Program', 'HMP Focus'],
      ['TEP', 'Teacher Education Program', 'TEP Focus']
    ];
    for (const [code, name, focus] of programsList) {
      await conn.query('INSERT INTO programs (code, name, focus) VALUES (?, ?, ?)', [code, name, focus]);
    }

    // 6. Program majors
    await conn.query('INSERT INTO program_majors (code, name, program_code, program_head_id) VALUES (?, ?, ?, ?)', ['BSIT', 'Bachelor of Science in Information Technology', 'ITP', programHeadUser.insertId]);
    await conn.query('INSERT INTO program_majors (code, name, program_code, program_head_id) VALUES (?, ?, ?, ?)', ['BSBA', 'Bachelor of Science in Business Administration', 'BSA', programHeadUser.insertId]);

    // 7. Year levels
    const [majorIT] = await conn.query('SELECT id FROM program_majors WHERE code = ? LIMIT 1', ['BSIT']);
    await conn.query('INSERT INTO year_levels (program_major_id, year_level) VALUES (?, ?)', [majorIT[0].id, '1st Year']);
    await conn.query('INSERT INTO year_levels (program_major_id, year_level) VALUES (?, ?)', [majorIT[0].id, '2nd Year']);

    // 8. Teachers
    const [majorBSIT] = await conn.query('SELECT id FROM program_majors WHERE code = ? LIMIT 1', ['BSIT']);
    await conn.query('INSERT INTO teachers (id, name, email, phone, status, program_major_id) VALUES (?, ?, ?, ?, ?, ?)', ['T001', 'Maria Santos', teacherEmail, '123-456', 'Full-Time', majorBSIT[0].id]);

    // 9. Teacher availability
    await conn.query('INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)', ['T001', 'Monday', '08:00:00', '17:00:00']);

    // 10. Courses
    const coursesList = [
      ['BSCS', 'Bachelor of Science in Computer Science', 'ITP', 4],
      ['BSBA', 'Bachelor of Science in Business Administration', 'BSA', 4],
      ['BSCrim', 'Bachelor of Science in Criminology', 'CJEP', 4]
    ];
    for (const [code, name, program_code, duration] of coursesList) {
      await conn.query('INSERT INTO courses (code, name, program_code, year_duration) VALUES (?, ?, ?, ?)', [code, name, program_code, duration]);
    }

    // 11. Sections
    await conn.query('INSERT INTO sections (course_code, year_level, section_label, adviser_id, students, semester_id, academic_year_id) VALUES (?, ?, ?, ?, ?, ?, ?)', ['BSCS', 1, 'A', 'T001', 30, 1, 1]);

    // 12. Subjects
    await conn.query('INSERT INTO subjects (code, name, units, lecture_hours, lab_hours, semester_id, program_code, instructor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['CS101', 'Intro to Programming', 3, 3, 0, 1, 'ITP', 'T001']);

    // 14. Rooms
    const roomsList = [
      ['R-101', 40, 'Main Building', 'Lecture', 'active'],
      ['LAB-02', 24, 'Science Block', 'Laboratory', 'active'],
      ['R-202', 60, 'Annex', 'Lecture', 'active']
    ];
    for (const [number, capacity, building, type, status] of roomsList) {
      await conn.query('INSERT INTO rooms (number, capacity, building, type, status) VALUES (?, ?, ?, ?, ?)', [number, capacity, building, type, status]);
    }

    // 15. Schedules
    await conn.query('INSERT INTO schedules (day, start_time, end_time, subject_code, section_id, faculty_id, room_number, semester_id, academic_year_id, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['Monday', '08:00:00', '11:00:00', 'CS101', 1, 'T001', 'LAB-02', 1, 1, '#2563eb']);

    // 16. Exam Schedules
    await conn.query(
      `INSERT INTO exam_schedules (term, exam_date, start_time, end_time, subject_code, section_names, room_number, building, proctor_id, proctor_name, program_code, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Midterm', '2026-10-15', '08:00:00', '10:00:00', 'CS101', JSON.stringify(['BSCS 1-A']), 'LAB-02', 'Science Block', 'T001', 'Maria Santos', 'ITP', '#2563eb']
    );

    console.log('Sample 3NF data seeded successfully.');

  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

run();


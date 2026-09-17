require('dotenv').config();
const { pool } = require('../database/pool');

async function migrateToFinalCDM() {
  const conn = await pool.getConnection();
  try {
    console.log('=== STARTING FINAL LEVEL 1 CDM DATABASE MIGRATION ===');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. DAY Entity (days table)
    console.log('1. Setting up DAY entity (days table)...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS days (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(20) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_days_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const standardDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let i = 0; i < standardDays.length; i++) {
      await conn.query(`
        INSERT INTO days (id, name) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name)
      `, [i + 1, standardDays[i]]);
    }
    console.log('   ✓ Seeded standard school days (Monday to Saturday)');

    // 2. SEMESTER/TERM Entity (semesters table)
    console.log('2. Updating SEMESTER entity (semesters table)...');
    try {
      await conn.query(`ALTER TABLE semesters ADD COLUMN school_year VARCHAR(50) NOT NULL DEFAULT '2026-2027'`);
    } catch (e) {
      // already exists
    }
    try {
      await conn.query(`ALTER TABLE semesters ADD COLUMN term VARCHAR(50) DEFAULT NULL`);
      await conn.query(`UPDATE semesters SET term = name WHERE term IS NULL`);
    } catch (e) {
      // already exists
    }
    console.log('   ✓ Semesters table updated with school_year and term');

    // 3. PROGRAM Entity (programs table)
    console.log('3. Updating PROGRAM entity (programs table)...');
    try {
      await conn.query(`ALTER TABLE programs ADD COLUMN description VARCHAR(255) DEFAULT NULL`);
      await conn.query(`UPDATE programs SET description = focus WHERE description IS NULL AND focus IS NOT NULL`);
    } catch (e) {
      // already exists
    }

    const standardPrograms = [
      ['BAP', 'Business Administration Program', 'Business Administration & Management'],
      ['ITP', 'Information Technology Program', 'Computing & IT'],
      ['CJEP', 'Criminal Justice Education Program', 'Criminology & Law Enforcement'],
      ['TEP', 'Teacher Education Program', 'Secondary & Elementary Education'],
      ['HMP', 'Hospitality Management Program', 'Hotel, Restaurant & Tourism'],
      ['ALL', 'General Education Department', 'Institutional Core Curriculum']
    ];
    for (const [code, name, desc] of standardPrograms) {
      await conn.query(`
        INSERT INTO programs (code, name, description) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)
      `, [code, name, desc]);
    }
    console.log('   ✓ Programs updated and all 5 programs preserved');

    // 4. MAJOR Entity (program_majors table)
    console.log('4. Updating MAJOR entity (program_majors table)...');
    const standardMajors = [
      ['BSIT', 'Bachelor of Science in Information Technology', 'ITP'],
      ['BSBA', 'Bachelor of Science in Business Administration', 'BAP'],
      ['BSCRIM', 'Bachelor of Science in Criminology', 'CJEP'],
      ['BSHM', 'Bachelor of Science in Hospitality Management', 'HMP'],
      ['BSED', 'Bachelor of Secondary Education', 'TEP'],
      ['BEED', 'Bachelor of Elementary Education', 'TEP'],
    ];
    for (const [code, name, pCode] of standardMajors) {
      await conn.query(`
        INSERT INTO program_majors (code, name, program_code)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), program_code = VALUES(program_code)
      `, [code, name, pCode]);
    }
    console.log('   ✓ Program Majors updated');

    // 5. SECTIONS Entity (sections table)
    console.log('5. Migrating SECTION entity to remove Course dependency...');
    try {
      await conn.query(`ALTER TABLE sections ADD COLUMN program_code VARCHAR(30) DEFAULT 'TEP'`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE sections ADD COLUMN major_id BIGINT UNSIGNED DEFAULT NULL`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE sections ADD COLUMN section_name VARCHAR(100) DEFAULT NULL`);
    } catch (e) {}

    // Populate program_code and major_id from course_code / section data
    await conn.query(`
      UPDATE sections s
      LEFT JOIN program_majors pm ON pm.code = s.course_code
      SET s.program_code = COALESCE(pm.program_code, 'TEP'),
          s.major_id = pm.id,
          s.section_name = CONCAT(COALESCE(s.course_code, 'TEP'), ' ', s.year_level, '-', s.section_label)
      WHERE s.section_name IS NULL
    `);

    // Remove foreign key from sections to courses
    try {
      await conn.query(`ALTER TABLE sections DROP FOREIGN KEY fk_sections_course`);
    } catch (e) {}
    console.log('   ✓ Sections updated (course FK removed, program_code & major_id linked)');

    // 6. SUBJECTS Entity (subjects table)
    console.log('6. Updating SUBJECT entity...');
    try {
      await conn.query(`ALTER TABLE subjects ADD COLUMN major_id BIGINT UNSIGNED DEFAULT NULL`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE subjects ADD COLUMN subject_type VARCHAR(50) DEFAULT 'Minor'`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE subjects ADD COLUMN subject_title VARCHAR(200) DEFAULT NULL`);
      await conn.query(`UPDATE subjects SET subject_title = name WHERE subject_title IS NULL`);
    } catch (e) {}

    // Set subject_type appropriately
    await conn.query(`
      UPDATE subjects
      SET subject_type = CASE
        WHEN lab_hours > 0 THEN 'Major Laboratory'
        WHEN lecture_hours >= 2 AND program_code != 'ALL' THEN 'Major Lecture'
        WHEN program_code = 'ALL' OR code LIKE 'GE%' THEN 'General Education'
        ELSE 'Minor'
      END
      WHERE subject_type IS NULL OR subject_type = 'Minor'
    `);
    console.log('   ✓ Subjects table updated with major_id and subject_type');

    // 7. FACULTY Entity (teachers table)
    console.log('7. Updating FACULTY entity...');
    try {
      await conn.query(`ALTER TABLE teachers ADD COLUMN employee_number VARCHAR(50) DEFAULT NULL`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE teachers ADD COLUMN first_name VARCHAR(100) DEFAULT NULL`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE teachers ADD COLUMN last_name VARCHAR(100) DEFAULT NULL`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE teachers ADD COLUMN position VARCHAR(100) DEFAULT 'Instructor'`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE teachers ADD COLUMN faculty_type ENUM('Full-Time', 'Part-Time') NOT NULL DEFAULT 'Full-Time'`);
      await conn.query(`UPDATE teachers SET faculty_type = status WHERE status IN ('Full-Time', 'Part-Time')`);
    } catch (e) {}

    // Populate employee_number, first_name, last_name from name
    const [allTeachers] = await conn.query(`SELECT id, name FROM teachers`);
    for (const t of allTeachers) {
      const parts = t.name.split(',').map(s => s.trim());
      let lastName = parts[0] || t.name;
      let firstName = parts[1] || '';
      const empNum = `EMP-${t.id.replace(/^T-?/, '')}`;
      await conn.query(`
        UPDATE teachers
        SET employee_number = COALESCE(employee_number, ?),
            last_name = COALESCE(last_name, ?),
            first_name = COALESCE(first_name, ?),
            position = COALESCE(position, 'Faculty Instructor')
        WHERE id = ?
      `, [empNum, lastName, firstName, t.id]);
    }
    console.log('   ✓ Teachers updated with employee_number, first/last names, position, faculty_type');

    // 8. USER Entity (users table)
    console.log('8. Updating USER entity...');
    try {
      await conn.query(`ALTER TABLE users ADD COLUMN faculty_id VARCHAR(30) DEFAULT NULL`);
      await conn.query(`
        UPDATE users u
        JOIN teachers t ON LOWER(t.email) = LOWER(u.email)
        SET u.faculty_id = t.id
        WHERE u.faculty_id IS NULL
      `);
    } catch (e) {}
    console.log('   ✓ Users table updated with faculty_id FK link');

    // 9. ROOM Entity (rooms table) - Remove Building
    console.log('9. Updating ROOM entity (removing separate Building entity)...');
    try {
      await conn.query(`ALTER TABLE rooms ADD COLUMN room_name VARCHAR(150) DEFAULT NULL`);
      await conn.query(`UPDATE rooms SET room_name = number WHERE room_name IS NULL`);
    } catch (e) {}
    console.log('   ✓ Room entity updated');

    // 10. SCHEDULE Entity (schedules table)
    console.log('10. Updating SCHEDULE entity...');
    try {
      await conn.query(`ALTER TABLE schedules ADD COLUMN day_id INT UNSIGNED DEFAULT NULL`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE schedules ADD COLUMN class_mode VARCHAR(50) DEFAULT 'Face-to-Face'`);
    } catch (e) {}

    // Map day strings to day_id
    await conn.query(`
      UPDATE schedules s
      JOIN days d ON LOWER(d.name) = LOWER(s.day)
      SET s.day_id = d.id
      WHERE s.day_id IS NULL
    `);
    console.log('   ✓ Schedules updated with day_id and class_mode');

    // 11. EXAMINATION SCHEDULE Entity (exam_schedules table)
    console.log('11. Updating EXAMINATION SCHEDULE entity...');
    try {
      await conn.query(`ALTER TABLE exam_schedules ADD COLUMN exam_period VARCHAR(50) DEFAULT 'Midterm'`);
      await conn.query(`UPDATE exam_schedules SET exam_period = term WHERE exam_period IS NULL AND term IS NOT NULL`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE exam_schedules ADD COLUMN class_mode VARCHAR(50) DEFAULT 'Face-to-Face'`);
    } catch (e) {}
    console.log('   ✓ Exam schedules updated with exam_period and class_mode');

    // 12. Safely Remove Obsolete Entities
    console.log('12. Safely removing obsolete tables...');
    // Drop teacher_availability table
    await conn.query(`DROP TABLE IF EXISTS teacher_availability`);
    console.log('   ✓ Dropped teacher_availability table');

    // Drop courses table
    await conn.query(`DROP TABLE IF EXISTS courses`);
    console.log('   ✓ Dropped courses table');

    // Drop buildings table if exists
    await conn.query(`DROP TABLE IF EXISTS buildings`);
    console.log('   ✓ Dropped buildings table if existed');

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('=== FINAL LEVEL 1 CDM MIGRATION COMPLETED SUCCESSFULLY ===\n');

    // Verification queries
    const [finalTables] = await conn.query('SHOW TABLES');
    console.log('Final Tables in Database:');
    console.table(finalTables);

    const [daysList] = await conn.query('SELECT * FROM days');
    console.log('Days Table:');
    console.table(daysList);

    const [progList] = await conn.query('SELECT code, name, description FROM programs');
    console.log('Programs Table:');
    console.table(progList);

    const [teachersCount] = await conn.query('SELECT count(*) as count FROM teachers');
    console.log('Total Faculty in DB:', teachersCount[0].count);

    const [schedCount] = await conn.query('SELECT count(*) as count FROM schedules');
    console.log('Total Schedules in DB:', schedCount[0].count);

    const [examCount] = await conn.query('SELECT count(*) as count FROM exam_schedules');
    console.log('Total Exam Schedules in DB:', examCount[0].count);

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrateToFinalCDM();

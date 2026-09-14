require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('../database/pool');

async function seedDemoAccounts() {
  const conn = await pool.getConnection();
  try {
    console.log('=== STARTING DEMO ACCOUNTS & FACULTY SEEDING ===');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // Ensure table structure for schedule_adjustment_requests
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schedule_adjustment_requests (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        schedule_id BIGINT UNSIGNED NOT NULL,
        requested_by_user_id BIGINT UNSIGNED NOT NULL,
        requester_name VARCHAR(160) NOT NULL,
        requester_program VARCHAR(50) NOT NULL,
        subject_code VARCHAR(30) NOT NULL,
        subject_name VARCHAR(200) NOT NULL,
        section_name VARCHAR(100) DEFAULT NULL,
        faculty_name VARCHAR(160) DEFAULT NULL,
        room_number VARCHAR(30) DEFAULT NULL,
        current_day VARCHAR(20) NOT NULL,
        current_start_time TIME NOT NULL,
        current_end_time TIME NOT NULL,
        suggested_day VARCHAR(20) DEFAULT NULL,
        suggested_start_time TIME DEFAULT NULL,
        suggested_end_time TIME DEFAULT NULL,
        suggested_room VARCHAR(30) DEFAULT NULL,
        reason TEXT NOT NULL,
        status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
        admin_response TEXT DEFAULT NULL,
        reviewed_by_user_id BIGINT UNSIGNED DEFAULT NULL,
        reviewed_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 1. Ensure Semesters & Academic Years
    await conn.query(`
      INSERT INTO academic_years (id, name, is_active)
      VALUES (1, '2026-2027', TRUE)
      ON DUPLICATE KEY UPDATE is_active = TRUE
    `);
    await conn.query(`
      INSERT INTO semesters (id, name, is_active)
      VALUES (1, '1st Semester', TRUE), (2, '2nd Semester', FALSE)
      ON DUPLICATE KEY UPDATE is_active = VALUES(is_active)
    `);

    // Ensure legacy BSA references are mapped to BAP
    await conn.query(`UPDATE courses SET program_code = 'BAP' WHERE program_code = 'BSA'`);
    await conn.query(`UPDATE subjects SET program_code = 'BAP' WHERE program_code = 'BSA'`);
    await conn.query(`UPDATE program_majors SET program_code = 'BAP' WHERE program_code = 'BSA'`);
    await conn.query(`UPDATE users SET program = 'BAP' WHERE program = 'BSA'`);
    await conn.query(`DELETE FROM programs WHERE code = 'BSA'`);

    // 2. Ensure Academic Programs
    const programsList = [
      ['ITP', 'Information Technology Program', 'Computing & IT'],
      ['BAP', 'Business Administration Program', 'Business Administration & Management'],
      ['CJEP', 'Criminal Justice Education Program', 'Criminology & Law Enforcement'],
      ['HMP', 'Hospitality Management Program', 'Hotel, Restaurant & Tourism'],
      ['TEP', 'Teacher Education Program', 'Secondary & Elementary Education'],
    ];

    for (const [code, name, focus] of programsList) {
      await conn.query(`
        INSERT INTO programs (code, name, focus)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), focus = VALUES(focus)
      `, [code, name, focus]);
    }

    // 3. Ensure Program Majors
    const majorsList = [
      ['BSIT', 'Bachelor of Science in Information Technology', 'ITP'],
      ['BSBA', 'Bachelor of Science in Business Administration', 'BAP'],
      ['BSCRIM', 'Bachelor of Science in Criminology', 'CJEP'],
      ['BSHM', 'Bachelor of Science in Hospitality Management', 'HMP'],
      ['BSED', 'Bachelor of Secondary Education', 'TEP'],
    ];

    for (const [code, name, pCode] of majorsList) {
      await conn.query(`
        INSERT INTO program_majors (code, name, program_code)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), program_code = VALUES(program_code)
      `, [code, name, pCode]);
    }

    // 4. Create / Update Super Admin and Admin accounts
    const superAdminPasswordHash = await bcrypt.hash('@superadmin123', 10);
    const adminPasswordHash = await bcrypt.hash('@admin123', 10);
    const progHeadPasswordHash = await bcrypt.hash('@program123', 10);
    const teacherPasswordHash = await bcrypt.hash('@teacher123', 10);

    // Super Admin
    await conn.query(`
      INSERT INTO users (name, email, password_hash, role, status, program)
      VALUES (?, ?, ?, 'super_admin', 'Active', NULL)
      ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = 'super_admin', status = 'Active'
    `, ['ICT Super Administrator', 'superadmin@srcb.edu.ph', superAdminPasswordHash]);

    // Admin / DSA
    await conn.query(`
      INSERT INTO users (name, email, password_hash, role, status, program)
      VALUES (?, ?, ?, 'admin', 'Active', NULL)
      ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = 'admin', status = 'Active'
    `, ['System Administrator', 'admin@srcb.edu.ph', adminPasswordHash]);

    // 5. Create EXACTLY ONE Program Head per Program
    const programHeads = [
      {
        name: 'Dr. Alan Turing',
        email: 'ithead@srcb.edu.ph',
        program: 'ITP',
        majorCode: 'BSIT',
      },
      {
        name: 'Dr. Peter Drucker',
        email: 'businesshead@srcb.edu.ph',
        program: 'BAP',
        majorCode: 'BSBA',
      },
      {
        name: 'Dr. August Vollmer',
        email: 'crimhead@srcb.edu.ph',
        program: 'CJEP',
        majorCode: 'BSCRIM',
      },
      {
        name: 'Prof. Georges Escoffier',
        email: 'hmhead@srcb.edu.ph',
        program: 'HMP',
        majorCode: 'BSHM',
      },
      {
        name: 'Dr. Maria Montessori',
        email: 'educhead@srcb.edu.ph',
        program: 'TEP',
        majorCode: 'BSED',
      },
    ];

    // Clear existing program_head_id links first to avoid foreign key / duplicate conflicts
    await conn.query('UPDATE program_majors SET program_head_id = NULL');

    for (const ph of programHeads) {
      await conn.query(`
        INSERT INTO users (name, email, password_hash, role, status, program)
        VALUES (?, ?, ?, 'program_head', 'Active', ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          password_hash = VALUES(password_hash),
          role = 'program_head',
          status = 'Active',
          program = VALUES(program)
      `, [ph.name, ph.email, progHeadPasswordHash, ph.program]);

      const [userRow] = await conn.query('SELECT id FROM users WHERE email = ? LIMIT 1', [ph.email]);
      if (userRow && userRow[0]) {
        const userId = userRow[0].id;
        await conn.query('UPDATE program_majors SET program_head_id = ? WHERE code = ?', [userId, ph.majorCode]);
      }
    }

    // 6. Ensure Program Major ID lookups
    const [majorsRows] = await conn.query('SELECT id, code, program_code FROM program_majors');
    const majorMap = new Map();
    for (const m of majorsRows) {
      majorMap.set(m.code, m.id);
    }

    // 7. Seed Teachers for Major and General Subjects
    const teachersList = [
      // ITP / BSIT Teachers
      {
        id: 'T-IT-001',
        name: 'Prof. Ada Lovelace',
        email: 'adalovelace-it@srcb.edu.ph',
        phone: '0917-101-0001',
        status: 'Full-Time',
        majorCode: 'BSIT',
        userProgram: 'ITP',
      },
      {
        id: 'T-IT-002',
        name: 'Prof. Grace Hopper',
        email: 'gracehopper-it@srcb.edu.ph',
        phone: '0917-101-0002',
        status: 'Full-Time',
        majorCode: 'BSIT',
        userProgram: 'ITP',
      },
      // BAP / BSBA Teachers
      {
        id: 'T-BA-001',
        name: 'Prof. Warren Buffett',
        email: 'warrenbuffett-ba@srcb.edu.ph',
        phone: '0917-202-0001',
        status: 'Full-Time',
        majorCode: 'BSBA',
        userProgram: 'BAP',
      },
      {
        id: 'T-BA-002',
        name: 'Prof. Philip Kotler',
        email: 'philipkotler-ba@srcb.edu.ph',
        phone: '0917-202-0002',
        status: 'Full-Time',
        majorCode: 'BSBA',
        userProgram: 'BAP',
      },
      // CJEP / BSCRIM Teachers
      {
        id: 'T-CRIM-001',
        name: 'Atty. Cesare Beccaria',
        email: 'cesarebeccaria-crim@srcb.edu.ph',
        phone: '0917-303-0001',
        status: 'Full-Time',
        majorCode: 'BSCRIM',
        userProgram: 'CJEP',
      },
      {
        id: 'T-CRIM-002',
        name: 'Capt. Hans Gross',
        email: 'hansgross-crim@srcb.edu.ph',
        phone: '0917-303-0002',
        status: 'Full-Time',
        majorCode: 'BSCRIM',
        userProgram: 'CJEP',
      },
      // HMP / BSHM Teachers
      {
        id: 'T-HM-001',
        name: 'Chef Gordon Ramsay',
        email: 'gordonramsay-hm@srcb.edu.ph',
        phone: '0917-404-0001',
        status: 'Full-Time',
        majorCode: 'BSHM',
        userProgram: 'HMP',
      },
      {
        id: 'T-HM-002',
        name: 'Chef Julia Child',
        email: 'juliachild-hm@srcb.edu.ph',
        phone: '0917-404-0002',
        status: 'Full-Time',
        majorCode: 'BSHM',
        userProgram: 'HMP',
      },
      // TEP / BSED Teachers
      {
        id: 'T-ED-001',
        name: 'Prof. John Dewey',
        email: 'johndewey-educ@srcb.edu.ph',
        phone: '0917-505-0001',
        status: 'Full-Time',
        majorCode: 'BSED',
        userProgram: 'TEP',
      },
      {
        id: 'T-ED-002',
        name: 'Prof. Lev Vygotsky',
        email: 'levvygotsky-educ@srcb.edu.ph',
        phone: '0917-505-0002',
        status: 'Full-Time',
        majorCode: 'BSED',
        userProgram: 'TEP',
      },
      // General Education Teachers
      {
        id: 'T-GEN-001',
        name: 'Prof. Socrates Santos',
        email: 'socrates-gen@srcb.edu.ph',
        phone: '0917-606-0001',
        status: 'Full-Time',
        majorCode: null,
        userProgram: 'ALL',
      },
      {
        id: 'T-GEN-002',
        name: 'Prof. Jose Rizal',
        email: 'rizal-gen@srcb.edu.ph',
        phone: '0917-606-0002',
        status: 'Full-Time',
        majorCode: null,
        userProgram: 'ALL',
      },
    ];

    for (const t of teachersList) {
      const pmId = t.majorCode ? majorMap.get(t.majorCode) || null : null;

      // Insert/update in teachers table
      await conn.query(`
        INSERT INTO teachers (id, name, email, phone, status, program_major_id)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          email = VALUES(email),
          phone = VALUES(phone),
          status = VALUES(status),
          program_major_id = VALUES(program_major_id)
      `, [t.id, t.name, t.email, t.phone, t.status, pmId]);

      // Insert/update in users table
      await conn.query(`
        INSERT INTO users (name, email, password_hash, role, status, program)
        VALUES (?, ?, ?, 'teacher', 'Active', ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          password_hash = VALUES(password_hash),
          role = 'teacher',
          status = 'Active',
          program = VALUES(program)
      `, [t.name, t.email, teacherPasswordHash, t.userProgram]);
    }

    // 8. Assign Subjects to Dedicated Teachers
    const subjectAssignments = [
      // ITP
      { code: 'CS101', instructorId: 'T-IT-001', programCode: 'ITP' },
      { code: 'IT 102', instructorId: 'T-IT-001', programCode: 'ITP' },
      { code: 'IT 201', instructorId: 'T-IT-002', programCode: 'ITP' },
      { code: 'IT 301', instructorId: 'T-IT-002', programCode: 'ITP' },
      { code: 'GE 1', instructorId: 'T-GEN-001', programCode: 'ITP' },
      { code: 'GE 2', instructorId: 'T-GEN-002', programCode: 'ITP' },
      // BAP
      { code: 'BA 101', instructorId: 'T-BA-001', programCode: 'BAP' },
      { code: 'FIN 201', instructorId: 'T-BA-001', programCode: 'BAP' },
      { code: 'MKTG 101', instructorId: 'T-BA-002', programCode: 'BAP' },
      // CJEP
      { code: 'CLJ 1', instructorId: 'T-CRIM-001', programCode: 'CJEP' },
      { code: 'CRIM 101', instructorId: 'T-CRIM-001', programCode: 'CJEP' },
      { code: 'FORENSIC 1', instructorId: 'T-CRIM-002', programCode: 'CJEP' },
      { code: 'LEA 1', instructorId: 'T-CRIM-002', programCode: 'CJEP' },
      // HMP
      { code: 'HM 101', instructorId: 'T-HM-001', programCode: 'HMP' },
      { code: 'CUL 101', instructorId: 'T-HM-001', programCode: 'HMP' },
      { code: 'FBM 201', instructorId: 'T-HM-002', programCode: 'HMP' },
      // TEP
      { code: 'EDUC 101', instructorId: 'T-ED-001', programCode: 'TEP' },
      { code: 'EDUC 102', instructorId: 'T-ED-001', programCode: 'TEP' },
    ];

    for (const sub of subjectAssignments) {
      await conn.query(`
        UPDATE subjects
        SET instructor_id = ?, program_code = ?
        WHERE code = ?
      `, [sub.instructorId, sub.programCode, sub.code]);
    }

    // 9. Teacher Availability (Monday to Friday 07:00:00 - 18:00:00)
    await conn.query('TRUNCATE TABLE teacher_availability');
    const teachingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    for (const t of teachersList) {
      for (const day of teachingDays) {
        await conn.query(`
          INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time)
          VALUES (?, ?, '07:00:00', '18:00:00')
        `, [t.id, day]);
      }
    }

    // 10. Reassign Schedules & Exam Schedules to Matching Teacher IDs
    const subjectToTeacherMap = new Map();
    for (const s of subjectAssignments) {
      subjectToTeacherMap.set(s.code.toUpperCase(), s.instructorId);
    }

    const [allSchedules] = await conn.query('SELECT id, subject_code FROM schedules');
    for (const sched of allSchedules) {
      const codeKey = (sched.subject_code || '').toUpperCase();
      const targetTeacherId = subjectToTeacherMap.get(codeKey) || 'T-IT-001';
      await conn.query('UPDATE schedules SET faculty_id = ? WHERE id = ?', [targetTeacherId, sched.id]);
    }

    const [allExams] = await conn.query('SELECT id, subject_code FROM exam_schedules');
    for (const exam of allExams) {
      const codeKey = (exam.subject_code || '').toUpperCase();
      const targetTeacherId = subjectToTeacherMap.get(codeKey) || 'T-IT-001';
      const teacherObj = teachersList.find((t) => t.id === targetTeacherId);
      const proctorName = teacherObj ? teacherObj.name : 'Prof. Ada Lovelace';
      await conn.query(`
        UPDATE exam_schedules
        SET proctor_id = ?, proctor_name = ?
        WHERE id = ?
      `, [targetTeacherId, proctorName, exam.id]);
    }

    // 11. Clean Up Unnecessary / Duplicate User Accounts
    const validEmails = new Set([
      'superadmin@srcb.edu.ph',
      'admin@srcb.edu.ph',
      ...programHeads.map((ph) => ph.email.toLowerCase()),
      ...teachersList.map((t) => t.email.toLowerCase()),
    ]);

    const [allUsers] = await conn.query('SELECT id, email, role FROM users');
    const usersToDelete = allUsers.filter((u) => !validEmails.has(u.email.toLowerCase()));

    for (const u of usersToDelete) {
      console.log(`Cleaning up unused user account: ID ${u.id}, Email: ${u.email}, Role: ${u.role}`);
      try {
        await conn.query('UPDATE schedule_adjustment_requests SET requested_by_user_id = 1 WHERE requested_by_user_id = ?', [u.id]);
        await conn.query('UPDATE schedule_adjustment_requests SET reviewed_by_user_id = 1 WHERE reviewed_by_user_id = ?', [u.id]);
      } catch (e) {
        // ignore if table not present
      }
      await conn.query('DELETE FROM reset_tokens WHERE user_id = ?', [u.id]);
      await conn.query('DELETE FROM users WHERE id = ?', [u.id]);
    }

    // 12. Clean Up Unused Teacher Records
    const validTeacherIds = new Set(teachersList.map((t) => t.id));
    const [allTeachers] = await conn.query('SELECT id, name, email FROM teachers');
    const teachersToDelete = allTeachers.filter((t) => !validTeacherIds.has(t.id));

    for (const t of teachersToDelete) {
      console.log(`Cleaning up unused teacher profile: ID ${t.id}, Name: ${t.name}`);
      await conn.query('DELETE FROM teacher_availability WHERE teacher_id = ?', [t.id]);
      await conn.query('UPDATE sections SET adviser_id = NULL WHERE adviser_id = ?', [t.id]);
      await conn.query('DELETE FROM teachers WHERE id = ?', [t.id]);
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('=== DEMO ACCOUNTS AND FACULTY ASSIGNMENTS SEEDED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Error during demo accounts seeding:', err);
    throw err;
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  seedDemoAccounts()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedDemoAccounts };

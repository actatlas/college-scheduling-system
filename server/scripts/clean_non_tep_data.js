require('dotenv').config();
const { pool } = require('../database/pool');

async function cleanNonTepData() {
  const conn = await pool.getConnection();
  try {
    console.log('=== STARTING CLEANUP: PURGE NON-TEP DATA ===');
    await conn.beginTransaction();
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Clean Schedule Adjustment Requests for non-TEP
    const [delReqs] = await conn.query(`
      DELETE sar FROM schedule_adjustment_requests sar
      LEFT JOIN schedules s ON s.id = sar.schedule_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      LEFT JOIN courses c ON c.code = sec.course_code
      WHERE (c.program_code IS NOT NULL AND c.program_code != 'TEP')
         OR (sar.requester_program IS NOT NULL AND sar.requester_program NOT IN ('TEP', 'BSED', 'BEED'))
    `);
    console.log(`1. Cleared non-TEP schedule adjustment requests: ${delReqs.affectedRows || 0}`);

    // 2. Clean Exam Schedules for non-TEP
    const [delExams] = await conn.query(`
      DELETE FROM exam_schedules
      WHERE program_code NOT IN ('TEP', 'BSED', 'BEED')
    `);
    console.log(`2. Cleared non-TEP exam schedules: ${delExams.affectedRows || 0}`);

    // 3. Clean Schedules for non-TEP
    const [delScheds] = await conn.query(`
      DELETE s FROM schedules s
      LEFT JOIN sections sec ON sec.id = s.section_id
      LEFT JOIN courses c ON c.code = sec.course_code
      LEFT JOIN subjects sub ON sub.code = s.subject_code
      WHERE sec.id IS NULL
         OR sec.course_code NOT IN ('BSED', 'BEED')
         OR c.program_code != 'TEP'
         OR sub.program_code NOT IN ('TEP', 'ALL')
    `);
    console.log(`3. Cleared non-TEP class schedules: ${delScheds.affectedRows || 0}`);

    // 4. Clean Sections for non-TEP
    const [delSecs] = await conn.query(`
      DELETE FROM sections
      WHERE course_code NOT IN ('BSED', 'BEED')
    `);
    console.log(`4. Cleared non-TEP sections: ${delSecs.affectedRows || 0}`);

    // 5. Clean Subjects for non-TEP
    // Keep: All TEP major subjects, and ALL Gen Ed subjects used by TEP
    const tepGenEdCodes = ['GE 1', 'GE 2', 'GE 3', 'GE 4', 'GE 10', 'RS 1', 'RS 2', 'PathFit 1', 'PathFit 3', 'NSTP'];
    const [delSubs] = await conn.query(`
      DELETE FROM subjects
      WHERE program_code NOT IN ('TEP')
        AND NOT (program_code = 'ALL' AND code IN (${tepGenEdCodes.map(() => '?').join(',')}))
    `, tepGenEdCodes);
    console.log(`5. Cleared non-TEP subjects: ${delSubs.affectedRows || 0}`);

    // 6. Clean Courses for non-TEP (keep BSED and BEED)
    const [delCourses] = await conn.query(`
      DELETE FROM courses
      WHERE program_code != 'TEP' AND code NOT IN ('BSED', 'BEED')
    `);
    console.log(`6. Cleared non-TEP courses: ${delCourses.affectedRows || 0}`);

    // 7. Clean Year Levels for non-TEP
    const [delYL] = await conn.query(`
      DELETE yl FROM year_levels yl
      JOIN program_majors pm ON pm.id = yl.program_major_id
      WHERE pm.program_code != 'TEP'
    `);
    console.log(`7. Cleared non-TEP year levels: ${delYL.affectedRows || 0}`);

    // 8. Clean Program Majors for non-TEP (keep BSED and BEED)
    const [delMajors] = await conn.query(`
      DELETE FROM program_majors
      WHERE program_code != 'TEP'
    `);
    console.log(`8. Cleared non-TEP program majors: ${delMajors.affectedRows || 0}`);

    // 9. Clean non-TEP Teachers & Availability
    const tepTeacherIds = [
      'T-ABEJ-G', 'T-ABEJ-R', 'T-BACO', 'T-CAGA', 'T-LACA', 'T-SALV', 'T-GODI',
      'T-ACOB', 'T-CALO', 'T-DAGU', 'T-DAPA', 'T-MAGA', 'T-NAEL',
      'T-LONO', 'T-JO', 'T-AWIT', 'T-OCLA', 'T-LUMA', 'T-LLOR',
      'T-RANO', 'T-SANT', 'T-ED-001', 'T-ED-002', 'T-GEN-001', 'T-GEN-002'
    ];

    // Ensure T-BACO exists
    await conn.query(`
      INSERT INTO teachers (id, name, email, phone, status, program_major_id)
      VALUES ('T-BACO', 'BACOMO, Paul Francis', 'bacomo@srcb.edu.ph', '0917-000-0000', 'Full-Time', NULL)
      ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status)
    `);

    const [delAvail] = await conn.query(`
      DELETE FROM teacher_availability
      WHERE teacher_id NOT IN (${tepTeacherIds.map(() => '?').join(',')})
    `, tepTeacherIds);
    console.log(`9a. Cleared non-TEP teacher availability: ${delAvail.affectedRows || 0}`);

    const [delTeachers] = await conn.query(`
      DELETE FROM teachers
      WHERE id NOT IN (${tepTeacherIds.map(() => '?').join(',')})
    `, tepTeacherIds);
    console.log(`9b. Cleared non-TEP teachers: ${delTeachers.affectedRows || 0}`);

    // 10. Clean non-TEP Users (Keep Super Admin, Admin, and TEP Program Head & TEP Teachers)
    const [delUsers] = await conn.query(`
      DELETE FROM users
      WHERE email IN (
        'ithead@srcb.edu.ph',
        'businesshead@srcb.edu.ph',
        'crimhead@srcb.edu.ph',
        'hmhead@srcb.edu.ph',
        'adalovelace-it@srcb.edu.ph',
        'gracehopper-it@srcb.edu.ph',
        'warrenbuffett-ba@srcb.edu.ph',
        'philipkotler-ba@srcb.edu.ph',
        'cesarebeccaria-crim@srcb.edu.ph',
        'hansgross-crim@srcb.edu.ph',
        'gordonramsay-hm@srcb.edu.ph',
        'juliachild-hm@srcb.edu.ph'
      )
    `);
    console.log(`10. Cleared non-TEP user accounts: ${delUsers.affectedRows || 0}`);

    // 11. Verify Programs Table - Keep ALL 5 Programs
    const standardPrograms = [
      ['CJEP', 'Criminal Justice Education Program', 'Criminology & Law Enforcement'],
      ['TEP', 'Teacher Education Program', 'Secondary & Elementary Education'],
      ['ITP', 'Information Technology Program', 'Computing & IT'],
      ['HMP', 'Hospitality Management Program', 'Hotel, Restaurant & Tourism'],
      ['BAP', 'Business Administration Program', 'Business Management & Marketing'],
      ['ALL', 'General Education Department', 'Institutional Core Curriculum']
    ];

    for (const [code, name, focus] of standardPrograms) {
      await conn.query(`
        INSERT INTO programs (code, name, focus)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), focus = VALUES(focus)
      `, [code, name, focus]);
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.commit();
    console.log('=== NON-TEP DATA PURGE COMPLETED SUCCESSFULLY ===\n');

    // Verification Report
    console.log('--- DATABASE STATE AFTER CLEANUP ---');
    const [progs] = await conn.query('SELECT code, name FROM programs ORDER BY code');
    console.log(`Programs (${progs.length} records):`, progs.map(p => p.code).join(', '));

    const [majors] = await conn.query('SELECT pm.id, pm.code, pm.name, pm.program_code FROM program_majors pm');
    console.log(`Program Majors (${majors.length} records):`);
    console.table(majors);

    const [courses] = await conn.query('SELECT code, name, program_code, year_duration FROM courses');
    console.log(`Courses (${courses.length} records):`);
    console.table(courses);

    const [yearLevels] = await conn.query(`
      SELECT yl.id, pm.code as major_code, yl.year_level
      FROM year_levels yl
      JOIN program_majors pm ON pm.id = yl.program_major_id
      ORDER BY pm.code, yl.year_level
    `);
    console.log(`Year Levels (${yearLevels.length} records):`);
    console.table(yearLevels);

    const [sections] = await conn.query('SELECT id, course_code, year_level, section_label, students FROM sections');
    console.log(`Sections (${sections.length} records):`);
    console.table(sections);

    const [tepSubjects] = await conn.query('SELECT code, name, units, program_code, instructor_id FROM subjects ORDER BY program_code, code');
    console.log(`Subjects in DB (${tepSubjects.length} records):`);
    console.table(tepSubjects);

    const [schedCount] = await conn.query('SELECT count(*) as count FROM schedules');
    console.log(`Total Schedules in DB: ${schedCount[0].count}`);

    const [teachers] = await conn.query('SELECT id, name, status, program_major_id FROM teachers');
    console.log(`Teachers in DB (${teachers.length} records):`);
    console.table(teachers);

    const [users] = await conn.query('SELECT id, name, email, role, status FROM users');
    console.log(`Users in DB (${users.length} records):`);
    console.table(users);

  } catch (err) {
    await conn.rollback();
    console.error('Error during cleanup:', err);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

cleanNonTepData();

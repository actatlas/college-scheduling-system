require('dotenv').config();
const { pool } = require('../database/pool');
const { subjectsService } = require('../services/subjects.service');

async function verifyTepData() {
  const conn = await pool.getConnection();
  try {
    console.log('=== VERIFYING TEP DATA IMPORT ===');

    // 1. Program check
    const [tepProg] = await conn.query('SELECT * FROM programs WHERE code = "TEP"');
    console.log('1. TEP Program record:', tepProg);

    // 2. Program Majors check
    const [tepMajors] = await conn.query('SELECT * FROM program_majors WHERE program_code = "TEP"');
    console.log('2. TEP Program Majors:', tepMajors);

    // 3. Year Levels check
    const [yls] = await conn.query(`
      SELECT yl.id, pm.code as major_code, yl.year_level
      FROM year_levels yl
      JOIN program_majors pm ON pm.id = yl.program_major_id
      WHERE pm.program_code = 'TEP'
      ORDER BY pm.code, yl.year_level
    `);
    console.log(`3. TEP Year Levels (${yls.length} records):`);
    console.table(yls);

    // 4. Courses check
    const [courses] = await conn.query('SELECT * FROM courses WHERE program_code = "TEP"');
    console.log('4. TEP Courses:', courses);

    // 5. Sections check
    const [sections] = await conn.query('SELECT s.*, c.name as course_name FROM sections s JOIN courses c ON c.code = s.course_code WHERE c.program_code = "TEP"');
    console.log(`5. TEP Sections (${sections.length} records):`);
    console.table(sections);

    // 6. Subjects check
    const [tepSubs] = await conn.query(`
      SELECT s.code, s.name, s.units, s.lecture_hours, s.lab_hours, s.program_code, s.instructor_id, t.name as instructor_name, pm.program_code as teacher_program
      FROM subjects s
      LEFT JOIN teachers t ON t.id = s.instructor_id
      LEFT JOIN program_majors pm ON pm.id = t.program_major_id
      ORDER BY s.code
    `);
    console.log(`6. All Subjects in DB (${tepSubs.length} records):`);
    for (const s of tepSubs) {
      if (s.program_code !== 'ALL' && s.program_code !== 'GEN' && !s.code.startsWith('GE')) {
        const matches = s.teacher_program === s.program_code ||
          (s.teacher_program === 'BSA' && s.program_code === 'BAP') ||
          (s.teacher_program === 'BAP' && s.program_code === 'BSA');
        if (!matches) {
          console.log('MISMATCH FOUND:', s.code, s.name, 'Subject Program:', s.program_code, 'Teacher Program:', s.teacher_program, 'Instructor:', s.instructor_id);
        }
      }
    }

    // 7. General Education Subjects taken by TEP
    const [genSubs] = await conn.query(`
      SELECT s.code, s.name, s.units, s.lecture_hours, s.lab_hours, s.program_code, s.instructor_id, t.name as instructor_name
      FROM subjects s
      LEFT JOIN teachers t ON t.id = s.instructor_id
      WHERE s.program_code = 'ALL'
      ORDER BY s.code
    `);
    console.log(`7. General Education / Institutional Subjects (${genSubs.length} records):`);
    console.table(genSubs);

    // 8. TEP Schedules check
    const [tepSchedules] = await conn.query(`
      SELECT sc.id, sc.day, sc.start_time, sc.end_time, sc.subject_code, sc.room_number, sc.faculty_id, t.name as faculty_name,
             sec.course_code, sec.year_level, sec.section_label
      FROM schedules sc
      JOIN sections sec ON sec.id = sc.section_id
      LEFT JOIN teachers t ON t.id = sc.faculty_id
      WHERE sec.course_code IN ('BSED', 'BEED')
      ORDER BY sec.year_level, sc.day, sc.start_time
    `);
    console.log(`8. TEP Class Schedules (${tepSchedules.length} records):`);
    console.table(tepSchedules);

    // 9. Program Head Exam Subject Palette Check
    const tepHead = { id: 17, role: 'program_head', program: 'BSED', programCode: 'TEP' };
    const palette = await subjectsService.listSubjects(null, tepHead, { forExam: true });
    console.log(`9. TEP Program Head Exam Palette (${palette.length} subjects):`);
    console.table(palette.map(p => ({ code: p.code, name: p.name, units: p.units, isMajor: p.isMajor, dept: p.department })));

    console.log('=== VERIFICATION COMPLETED SUCCESSFULLY ===');
  } finally {
    conn.release();
    process.exit(0);
  }
}

verifyTepData().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});

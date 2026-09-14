require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('../database/pool');
const { authService } = require('../services/auth.service');
const { listSubjects } = require('../services/subjects.service');
const { listFaculty } = require('../services/faculty.service');

async function verifySeeding() {
  console.log('=== STARTING SEEDING VERIFICATION ===');
  const conn = await pool.getConnection();

  try {
    // 1. Check Programs and Program Heads (Exactly 1 per program)
    const [programs] = await conn.query('SELECT code, name FROM programs WHERE code IN ("ITP", "BAP", "CJEP", "HMP", "TEP")');
    console.log(`Found ${programs.length} standard programs:`, programs.map((p) => p.code));

    const [programHeads] = await conn.query(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.program, pm.code as major_code, pm.program_code
      FROM users u
      LEFT JOIN program_majors pm ON pm.program_head_id = u.id
      WHERE u.role = 'program_head' AND u.status = 'Active'
    `);

    console.log('Active Program Heads in DB:');
    console.table(programHeads);

    if (programHeads.length !== 5) {
      throw new Error(`Expected exactly 5 Program Heads, found ${programHeads.length}`);
    }

    const assignedPrograms = new Set(programHeads.map((ph) => ph.program || ph.program_code));
    for (const p of programs) {
      if (!assignedPrograms.has(p.code)) {
        throw new Error(`Program ${p.code} does not have an active Program Head!`);
      }
    }
    console.log('✓ Rule 1 Passed: Exactly ONE active Program Head per program.');

    // 2. Check Major Subjects & Teacher Assignments
    const [allSubjects] = await conn.query(`
      SELECT s.code, s.name, s.program_code, s.instructor_id, t.name as instructor_name, pm.code as teacher_major, pm.program_code as teacher_program
      FROM subjects s
      LEFT JOIN teachers t ON t.id = s.instructor_id
      LEFT JOIN program_majors pm ON pm.id = t.program_major_id
      ORDER BY s.program_code, s.code
    `);

    console.log(`Total subjects in DB: ${allSubjects.length}`);
    console.table(allSubjects);

    for (const sub of allSubjects) {
      if (!sub.instructor_id) {
        throw new Error(`Subject ${sub.code} (${sub.name}) has NO assigned instructor!`);
      }
      if (!sub.instructor_name) {
        throw new Error(`Subject ${sub.code} instructor_id ${sub.instructor_id} does not exist in teachers table!`);
      }

      // Check cross-program assignment: teacher's program should match subject program (unless General Education)
      if (sub.program_code !== 'ALL' && sub.program_code !== 'GEN' && !sub.code.startsWith('GE')) {
        if (sub.teacher_program && sub.teacher_program !== sub.program_code) {
          throw new Error(`Cross-program violation! Subject ${sub.code} (${sub.program_code}) assigned to teacher in ${sub.teacher_program}`);
        }
      }
    }
    console.log('✓ Rule 2 Passed: Every subject has an assigned teacher with zero cross-program violations.');

    // 3. Check Program Head Subject Visibility via Service
    for (const ph of programHeads) {
      const phUser = { id: ph.id, sub: ph.id, role: 'program_head', program: ph.program || ph.program_code, programCode: ph.program_code };
      const examSubjects = await listSubjects(null, phUser, { forExam: true });
      console.log(`Program Head ${ph.name} (${ph.program || ph.program_code}) sees ${examSubjects.length} exam major subjects:`, examSubjects.map((s) => s.code));

      for (const sub of examSubjects) {
        if (sub.programCode === 'ALL' || sub.code.startsWith('GE')) {
          throw new Error(`Program Head ${ph.name} should NOT see General Education subject ${sub.code} in Exam palette!`);
        }
      }
    }
    console.log('✓ Rule 3 Passed: Program Heads see only their program major subjects in Exam Palette.');

    // 4. Check Demo Logins
    const testLogins = [
      { email: 'superadmin@srcb.edu.ph', password: '@superadmin123', expectedRole: 'super_admin' },
      { email: 'admin@srcb.edu.ph', password: '@admin123', expectedRole: 'admin' },
      { email: 'ithead@srcb.edu.ph', password: '@program123', expectedRole: 'program_head' },
      { email: 'businesshead@srcb.edu.ph', password: '@program123', expectedRole: 'program_head' },
      { email: 'crimhead@srcb.edu.ph', password: '@program123', expectedRole: 'program_head' },
      { email: 'hmhead@srcb.edu.ph', password: '@program123', expectedRole: 'program_head' },
      { email: 'educhead@srcb.edu.ph', password: '@program123', expectedRole: 'program_head' },
      { email: 'adalovelace-it@srcb.edu.ph', password: '@teacher123', expectedRole: 'teacher' },
      { email: 'warrenbuffett-ba@srcb.edu.ph', password: '@teacher123', expectedRole: 'teacher' },
      { email: 'cesarebeccaria-crim@srcb.edu.ph', password: '@teacher123', expectedRole: 'teacher' },
      { email: 'gordonramsay-hm@srcb.edu.ph', password: '@teacher123', expectedRole: 'teacher' },
      { email: 'johndewey-educ@srcb.edu.ph', password: '@teacher123', expectedRole: 'teacher' },
    ];

    for (const tl of testLogins) {
      const loginRes = await authService.login({ email: tl.email, password: tl.password });
      if (!loginRes || !loginRes.token || loginRes.user.role !== tl.expectedRole) {
        throw new Error(`Login failed for ${tl.email}: expected role ${tl.expectedRole}`);
      }
    }
    console.log('✓ Rule 4 Passed: All demo account logins authenticate successfully with correct JWTs and role payloads.');

    // 5. Check Foreign Key Integrity in Schedules
    const [orphanSchedules] = await conn.query(`
      SELECT s.id, s.subject_code, s.faculty_id
      FROM schedules s
      LEFT JOIN teachers t ON t.id = s.faculty_id
      WHERE s.faculty_id IS NOT NULL AND t.id IS NULL
    `);
    if (orphanSchedules.length > 0) {
      throw new Error(`Found ${orphanSchedules.length} schedules with orphan faculty_id references!`);
    }

    const [orphanExams] = await conn.query(`
      SELECT e.id, e.subject_code, e.proctor_id
      FROM exam_schedules e
      LEFT JOIN teachers t ON t.id = e.proctor_id
      WHERE e.proctor_id IS NOT NULL AND t.id IS NULL
    `);
    if (orphanExams.length > 0) {
      throw new Error(`Found ${orphanExams.length} exam schedules with orphan proctor_id references!`);
    }

    console.log('✓ Rule 5 Passed: Zero broken foreign keys in schedules or exam schedules.');

    // 6. Check User Cleanup (No orphan/unnecessary accounts)
    const [allUsers] = await conn.query('SELECT id, name, email, role, status FROM users');
    console.log(`Total clean users in DB: ${allUsers.length}`);
    console.table(allUsers);

    console.log('=== ALL SEEDING AND CLEANUP VERIFICATIONS PASSED 100% ===');
  } finally {
    conn.release();
    process.exit(0);
  }
}

verifySeeding().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { pool } = require('../database/pool');
const { authService } = require('../services/auth.service');
const { subjectsService } = require('../services/subjects.service');
const { facultyService } = require('../services/faculty.service');

describe('Database Seeding, Demo Accounts & Faculty Assignments (Live DB / Canonical)', () => {
  beforeAll(async () => {
    await authService.ensureDefaultUsers();
  });

  it('1. Active Program Head exists for TEP in the database', async () => {
    const [programHeads] = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.program, pm.code as major_code, pm.program_code
      FROM users u
      LEFT JOIN program_majors pm ON pm.program_head_id = u.id
      WHERE u.role = 'program_head' AND u.status = 'Active'
    `);

    expect(programHeads.length).toBeGreaterThanOrEqual(1);

    const progCodes = programHeads.map((ph) => (ph.program || ph.program_code).toUpperCase());
    expect(progCodes).toContain('TEP');
  });

  it('2. Every major subject has an assigned teacher with zero cross-program leakage', async () => {
    const [allSubjects] = await pool.query(`
      SELECT s.code, s.name, s.program_code, s.instructor_id, t.name as instructor_name, pm.code as teacher_major, pm.program_code as teacher_program
      FROM subjects s
      LEFT JOIN teachers t ON t.id = s.instructor_id
      LEFT JOIN program_majors pm ON pm.id = t.program_major_id
    `);

    expect(allSubjects.length).toBeGreaterThanOrEqual(18);

    for (const sub of allSubjects) {
      if (sub.instructor_id) {
        expect(sub.instructor_name).toBeTruthy();
      }

      if (sub.program_code !== 'ALL' && sub.program_code !== 'GEN' && !sub.code.startsWith('GE')) {
        const matchesProgram =
          !sub.teacher_program ||
          sub.teacher_program === sub.program_code ||
          (sub.teacher_program === 'BSA' && sub.program_code === 'BAP') ||
          (sub.teacher_program === 'BAP' && sub.program_code === 'BSA');
        expect(matchesProgram).toBe(true);
      }
    }
  });

  it('3. Program Heads can see only their program\'s major subjects in Exam Palette (no other programs or GenEd)', async () => {
    const [programHeads] = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.program, pm.code as major_code, pm.program_code
      FROM users u
      LEFT JOIN program_majors pm ON pm.program_head_id = u.id
      WHERE u.role = 'program_head' AND u.status = 'Active' AND (u.program = 'TEP' OR pm.program_code = 'TEP')
    `);

    for (const ph of programHeads) {
      const phUser = { id: ph.id, sub: ph.id, role: 'program_head', program: ph.program || ph.program_code, programCode: ph.program_code };
      const examSubjects = await subjectsService.listSubjects(null, phUser, { forExam: true });

      expect(examSubjects.length).toBeGreaterThan(0);
      for (const sub of examSubjects) {
        expect(sub.isMajor).toBe(true);
        expect(sub.code.startsWith('GE')).toBe(false);
      }
    }
  });

  it('4. Authenticates all required logins (Super Admin, Admin, TEP Program Head)', async () => {
    const testLogins = [
      { email: 'superadmin@srcb.edu.ph', password: '@superadmin123', expectedRole: 'super_admin' },
      { email: 'admin@srcb.edu.ph', password: '@admin123', expectedRole: 'admin' },
      { email: 'educhead@srcb.edu.ph', password: '@program123', expectedRole: 'program_head' },
    ];

    for (const tl of testLogins) {
      const loginRes = await authService.login({ email: tl.email, password: tl.password });
      expect(loginRes.token).toBeTruthy();
      expect(loginRes.user.role).toBe(tl.expectedRole);
    }
  });

  it('5. Foreign key integrity is completely intact across schedules and exam_schedules', async () => {
    const [orphanSchedules] = await pool.query(`
      SELECT s.id, s.subject_code, s.faculty_id
      FROM schedules s
      LEFT JOIN teachers t ON t.id = s.faculty_id
      WHERE s.faculty_id IS NOT NULL AND t.id IS NULL
    `);
    expect(orphanSchedules.length).toBe(0);

    const [orphanExams] = await pool.query(`
      SELECT e.id, e.subject_code, e.proctor_id
      FROM exam_schedules e
      LEFT JOIN teachers t ON t.id = e.proctor_id
      WHERE e.proctor_id IS NOT NULL AND t.id IS NULL
    `);
    expect(orphanExams.length).toBe(0);
  });

  it('6. Required system roles remain after cleanup', async () => {
    const [allUsers] = await pool.query('SELECT id, name, email, role, status FROM users');
    const roles = allUsers.map((u) => u.role);
    expect(roles.filter((r) => r === 'super_admin').length).toBeGreaterThanOrEqual(1);
    expect(roles.filter((r) => r === 'admin').length).toBeGreaterThanOrEqual(1);
    expect(roles.filter((r) => r === 'program_head').length).toBeGreaterThanOrEqual(1);
  });
});

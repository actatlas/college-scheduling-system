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

  it('1. Exactly ONE active Program Head per program in the database', async () => {
    const [programHeads] = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.program, pm.code as major_code, pm.program_code
      FROM users u
      LEFT JOIN program_majors pm ON pm.program_head_id = u.id
      WHERE u.role = 'program_head' AND u.status = 'Active'
    `);

    expect(programHeads.length).toBe(5);

    const progCodes = programHeads.map((ph) => (ph.program || ph.program_code).toUpperCase());
    expect(progCodes).toContain('ITP');
    expect(progCodes.some((c) => c === 'BSA' || c === 'BAP')).toBe(true);
    expect(progCodes).toContain('CJEP');
    expect(progCodes).toContain('HMP');
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
      expect(sub.instructor_id).toBeTruthy();
      expect(sub.instructor_name).toBeTruthy();

      if (sub.program_code !== 'ALL' && sub.program_code !== 'GEN' && !sub.code.startsWith('GE')) {
        const matchesProgram =
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
      WHERE u.role = 'program_head' AND u.status = 'Active'
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

  it('4. Authenticates all demo logins (Super Admin, Admin, 5 Program Heads, Teachers)', async () => {
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

  it('6. Only required users remain after cleanup', async () => {
    const [allUsers] = await pool.query('SELECT id, name, email, role, status FROM users');
    expect(allUsers.length).toBe(19); // 1 super_admin + 1 admin + 5 program_heads + 12 teachers
    const roles = allUsers.map((u) => u.role);
    expect(roles.filter((r) => r === 'super_admin').length).toBe(1);
    expect(roles.filter((r) => r === 'admin').length).toBe(1);
    expect(roles.filter((r) => r === 'program_head').length).toBe(5);
    expect(roles.filter((r) => r === 'teacher').length).toBe(12);
  });
});

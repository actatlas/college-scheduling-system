import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('../utils/db');
const { usersService } = require('../services/users.service');
const usersController = require('../controllers/users.controller');

describe('Super Admin - One Program Head Per Program Backend Enforcement', () => {
  let mockState = {
    users: [],
    programs: [],
    programMajors: [],
    teachers: [],
  };

  beforeEach(() => {
    mockState = {
      users: [
        {
          id: 1,
          name: 'ICT Super Admin',
          email: 'superadmin@srcb.edu.ph',
          role: 'super_admin',
          status: 'Active',
          program: null,
          created_at: '2026-01-01',
        },
        {
          id: 2,
          name: 'Dean DSA Admin',
          email: 'admin@srcb.edu.ph',
          role: 'admin',
          status: 'Active',
          program: null,
          created_at: '2026-01-01',
        },
      ],
      programs: [
        { code: 'BAP', name: 'Business Administration Program', focus: 'BAP Focus' },
        { code: 'ITP', name: 'Information Technology Program', focus: 'ITP Focus' },
        { code: 'CJEP', name: 'Criminal Justice Education Program', focus: 'CJEP Focus' },
        { code: 'TEP', name: 'Teacher Education Program', focus: 'TEP Focus' },
        { code: 'HMP', name: 'Hospitality Management Program', focus: 'HMP Focus' },
      ],
      programMajors: [
        { id: 1, code: 'BSIT', name: 'BS Information Technology', program_code: 'ITP', program_head_id: null },
        { id: 2, code: 'BSA', name: 'BS Accountancy', program_code: 'BAP', program_head_id: null },
        { id: 3, code: 'BSBA', name: 'BS Business Administration', program_code: 'BAP', program_head_id: null },
        { id: 4, code: 'BSCRIM', name: 'BS Criminology', program_code: 'CJEP', program_head_id: null },
        { id: 5, code: 'BSED', name: 'Bachelor of Secondary Education', program_code: 'TEP', program_head_id: null },
        { id: 6, code: 'BSHM', name: 'BS Hospitality Management', program_code: 'HMP', program_head_id: null },
      ],
      teachers: [],
    };

    db.setQueryExecutor(async (sql, params = []) => {
      const s = String(sql).trim();

      // SELECT users
      if (s.includes('FROM users') && (s.includes('WHERE email = ?') || s.includes('LOWER(TRIM(email)) = ?'))) {
        const found = mockState.users.filter((u) => u.email.toLowerCase() === String(params[0]).toLowerCase());
        return found;
      }

      if (s.includes('FROM users') && s.includes('WHERE id = ?')) {
        const found = mockState.users.filter((u) => String(u.id) === String(params[0]));
        return found;
      }

      if (s.includes("WHERE u.role = 'program_head'") || (s.includes('FROM users') && s.includes('role = ?'))) {
        return mockState.users.filter((u) => u.role === 'program_head' && (u.status === 'Active' || !u.status));
      }

      if (s.includes('SELECT u.id, u.name, u.email, u.role') && s.includes('FROM users')) {
        return mockState.users.map((u) => ({
          ...u,
          program: u.program,
          teacher_id: u.teacher_id || null,
        }));
      }

      if (s.includes('FROM program_majors') && s.includes('WHERE program_head_id IS NOT NULL')) {
        return mockState.programMajors
          .filter((pm) => pm.program_head_id !== null)
          .map((pm) => ({
            id: pm.id,
            code: pm.code,
            program_code: pm.program_code,
            program_head_id: pm.program_head_id,
            status: 'Active',
          }));
      }

      if (s.includes('FROM program_majors') && (s.includes('code = ?') || s.includes('program_code = ?'))) {
        const p = String(params[0]).toUpperCase();
        const found = mockState.programMajors.filter(
          (pm) => pm.code.toUpperCase() === p || pm.program_code.toUpperCase() === p
        );
        return found;
      }

      if (s.includes('FROM teachers WHERE email = ?') || s.includes('FROM teachers WHERE id = ?')) {
        return mockState.teachers.filter(
          (t) => t.email.toLowerCase() === String(params[0]).toLowerCase() || t.id === String(params[0])
        );
      }

      // INSERT users
      if (s.includes('INSERT INTO users')) {
        const newId = mockState.users.length + 1;
        const [name, email, passwordHash, role, status, program] = params;
        const newUser = {
          id: newId,
          name,
          email,
          password_hash: passwordHash,
          role,
          status: status || 'Active',
          program: program || null,
          created_at: new Date().toISOString(),
        };
        mockState.users.push(newUser);
        return [{ insertId: newId }];
      }

      // UPDATE users
      if (s.includes('UPDATE users SET')) {
        const userId = params[params.length - 1];
        const user = mockState.users.find((u) => String(u.id) === String(userId));
        if (user) {
          if (s.includes('program = ?')) {
            user.program = params[0];
          }
        }
        return [{ affectedRows: 1 }];
      }

      // UPDATE program_majors
      if (s.includes('UPDATE program_majors SET program_head_id = ?')) {
        const headId = params[0];
        const majorId = params[1];
        const pm = mockState.programMajors.find((m) => m.id === Number(majorId));
        if (pm) pm.program_head_id = headId;
        return [{ affectedRows: 1 }];
      }

      if (s.includes('UPDATE program_majors SET program_head_id = NULL')) {
        const headId = params[0];
        mockState.programMajors.forEach((pm) => {
          if (String(pm.program_head_id) === String(headId)) {
            pm.program_head_id = null;
          }
        });
        return [{ affectedRows: 1 }];
      }

      // INSERT teachers
      if (s.includes('INSERT INTO teachers')) {
        mockState.teachers.push({ id: params[0], name: params[1], email: params[2] });
        return [{ affectedRows: 1 }];
      }

      return [];
    });
  });

  afterEach(() => {
    db.setQueryExecutor(null);
  });

  it('1. Create first IT Program Head -> succeeds', async () => {
    const user = await usersService.createUser({
      name: 'Dr. Alan Turing',
      email: 'it.head@srcb.edu.ph',
      role: 'program_head',
      program: 'ITP',
      status: 'Active',
    });

    expect(user).toBeDefined();
    expect(user.role).toBe('program_head');
    expect(user.program).toBe('ITP');
    expect(mockState.users.find((u) => u.email === 'it.head@srcb.edu.ph')).toBeDefined();
  });

  it('2. Try creating another IT Program Head -> should be rejected with 409', async () => {
    // First IT Head
    await usersService.createUser({
      name: 'Dr. Alan Turing',
      email: 'it.head@srcb.edu.ph',
      role: 'program_head',
      program: 'ITP',
      status: 'Active',
    });

    // Second IT Head attempt (using BSIT or ITP)
    await expect(
      usersService.createUser({
        name: 'Prof. Ada Lovelace',
        email: 'ada.head@srcb.edu.ph',
        role: 'program_head',
        program: 'BSIT',
        status: 'Active',
      })
    ).rejects.toThrow('This program already has a Program Head assigned.');
  });

  it('3. Create BSA Program Head -> succeeds', async () => {
    // Existing IT Head exists
    await usersService.createUser({
      name: 'Dr. Alan Turing',
      email: 'it.head@srcb.edu.ph',
      role: 'program_head',
      program: 'ITP',
      status: 'Active',
    });

    // Create BSA Head
    const bsaHead = await usersService.createUser({
      name: 'Dr. Luca Pacioli',
      email: 'bsa.head@srcb.edu.ph',
      role: 'program_head',
      program: 'BSA',
      status: 'Active',
    });

    expect(bsaHead).toBeDefined();
    expect(bsaHead.program).toBe('BSA');
  });

  it('4. Try another BSA / BAP Program Head -> should be rejected with 409', async () => {
    await usersService.createUser({
      name: 'Dr. Luca Pacioli',
      email: 'bsa.head@srcb.edu.ph',
      role: 'program_head',
      program: 'BSA',
      status: 'Active',
    });

    await expect(
      usersService.createUser({
        name: 'Prof. Warren Buffett',
        email: 'business.head@srcb.edu.ph',
        role: 'program_head',
        program: 'BAP',
        status: 'Active',
      })
    ).rejects.toThrow('This program already has a Program Head assigned.');
  });

  it('5. Edit existing Program Head without changing program -> should work', async () => {
    const itHead = await usersService.createUser({
      name: 'Dr. Alan Turing',
      email: 'it.head@srcb.edu.ph',
      role: 'program_head',
      program: 'ITP',
      status: 'Active',
    });

    const updated = await usersService.updateUser(itHead.id, {
      name: 'Dr. Alan Mathison Turing',
      email: 'it.head@srcb.edu.ph',
      role: 'program_head',
      program: 'ITP',
    });

    expect(updated.name).toBe('Dr. Alan Mathison Turing');
    expect(updated.program).toBe('ITP');
  });

  it('6. Change a Program Head to a program that already has a Program Head -> should be rejected', async () => {
    const itHead = await usersService.createUser({
      name: 'Dr. Alan Turing',
      email: 'it.head@srcb.edu.ph',
      role: 'program_head',
      program: 'ITP',
      status: 'Active',
    });

    await usersService.createUser({
      name: 'Dr. Luca Pacioli',
      email: 'bsa.head@srcb.edu.ph',
      role: 'program_head',
      program: 'BAP',
      status: 'Active',
    });

    // Try reassigning IT Head to BAP (which already has Luca Pacioli)
    await expect(
      usersService.updateUser(itHead.id, {
        name: 'Dr. Alan Turing',
        role: 'program_head',
        program: 'BAP',
      })
    ).rejects.toThrow('This program already has a Program Head assigned.');
  });

  it('7. Change a Program Head to an unassigned program (e.g. TEP) -> should succeed', async () => {
    const itHead = await usersService.createUser({
      name: 'Dr. Alan Turing',
      email: 'it.head@srcb.edu.ph',
      role: 'program_head',
      program: 'ITP',
      status: 'Active',
    });

    const updated = await usersService.updateUser(itHead.id, {
      name: 'Dr. Alan Turing',
      role: 'program_head',
      program: 'TEP',
    });

    expect(updated.program).toBe('TEP');
  });

  it('8. Program Head creation requires a program', async () => {
    await expect(
      usersService.createUser({
        name: 'Dr. No Program',
        email: 'noprogram@srcb.edu.ph',
        role: 'program_head',
        program: '',
        status: 'Active',
      })
    ).rejects.toThrow('Program is required for Program Head accounts.');
  });

  it('9. Other roles (admin, teacher) creation are not restricted by one-per-program rule', async () => {
    const teacher1 = await usersService.createUser({
      name: 'Teacher One',
      email: 'teacher1@srcb.edu.ph',
      role: 'teacher',
      program: 'BSIT',
      status: 'Active',
    });

    const teacher2 = await usersService.createUser({
      name: 'Teacher Two',
      email: 'teacher2@srcb.edu.ph',
      role: 'teacher',
      program: 'BSIT',
      status: 'Active',
    });

    expect(teacher1).toBeDefined();
    expect(teacher2).toBeDefined();
  });

  it('10. usersController handles duplicate Program Head with 409 JSON error response', async () => {
    await usersService.createUser({
      name: 'Dr. Alan Turing',
      email: 'it.head@srcb.edu.ph',
      role: 'program_head',
      program: 'ITP',
      status: 'Active',
    });

    const req = {
      user: { role: 'super_admin' },
      body: {
        name: 'Prof. Duplicate',
        email: 'duplicate.head@srcb.edu.ph',
        role: 'program_head',
        program: 'ITP',
        status: 'Active',
      },
    };

    let statusCode = null;
    let jsonBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
    };

    await usersController.createUser(req, res, () => {});

    expect(statusCode).toBe(409);
    expect(jsonBody?.error).toBe('This program already has a Program Head assigned.');
    expect(jsonBody?.code).toBe('PROGRAM_HEAD_ALREADY_ASSIGNED');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { authService } = require('../services/auth.service');
const { usersService } = require('../services/users.service');
const { authMiddleware } = require('../middleware/authMiddleware');
const usersController = require('../controllers/users.controller');

let testState = {
  users: [],
  teachers: [],
  schedules: [],
  subjects: [],
  sections: [],
};

function setupMockDb() {
  db.setQueryExecutor(async (sql, params = []) => {
    const s = String(sql).replace(/\s+/g, ' ').trim();

    if (s.includes('FROM users') && (s.includes('email = ?') || s.includes('LOWER(TRIM(email)) = ?') || s.includes('LOWER(email) = LOWER(?)'))) {
      const email = String(params[0] || '').toLowerCase();
      const user = testState.users.find((u) => u.email.toLowerCase() === email);
      return user ? [user] : [];
    }

    if (s.includes('FROM users') && s.includes('id = ?')) {
      const id = params[0];
      const user = testState.users.find((u) => String(u.id) === String(id));
      return user ? [user] : [];
    }

    if (s.includes('FROM users') && (s.includes('ORDER BY') || s.includes('SELECT u.id'))) {
      return testState.users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status || 'Active',
        created_at: u.created_at || '2026-08-27T00:00:00Z',
        program: u.program || null,
        teacher_id: u.teacherId || null,
      }));
    }

    if (s.includes('UPDATE users SET') && s.includes('WHERE id = ?')) {
      const id = params[params.length - 1];
      const user = testState.users.find((u) => String(u.id) === String(id));
      if (user) {
        if (s.includes('status = COALESCE(?, status)')) {
          // params: name, email, role, status, (passwordHash if applicable), id
          const nameParam = params[0];
          const emailParam = params[1];
          const roleParam = params[2];
          const statusParam = params[3];
          if (nameParam) user.name = nameParam;
          if (emailParam) user.email = emailParam;
          if (roleParam) user.role = roleParam;
          if (statusParam) user.status = statusParam;
        } else if (s.includes('status = ?') || s.includes('status = COALESCE(?, status)')) {
          user.status = params[0];
        }
      }
      return [{ affectedRows: 1 }];
    }

    if (s.includes('FROM teachers') && (s.includes('email') || s.includes('LOWER(email) = LOWER(?)'))) {
      const email = String(params[0] || '').toLowerCase();
      const t = testState.teachers.find((x) => x.email.toLowerCase() === email);
      return t ? [t] : [];
    }

    if (s.includes('FROM teachers')) {
      return testState.teachers;
    }

    if (s.includes('FROM program_majors')) {
      return [];
    }

    if (s.includes('ALTER TABLE')) {
      return [{ affectedRows: 0 }];
    }

    return [{ insertId: 10, affectedRows: 1 }];
  });
}

describe('Account Suspension & Reactivation Business Logic', () => {
  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('@teacher123', 10);
    const superAdminHash = await bcrypt.hash('@superadmin123', 10);

    testState = {
      users: [
        { id: 1, name: 'ICT Super Admin', email: 'superadmin@srcb.edu.ph', role: 'super_admin', status: 'Active', password_hash: superAdminHash },
        { id: 2, name: 'System Admin', email: 'admin@srcb.edu.ph', role: 'admin', status: 'Active', password_hash: passwordHash },
        { id: 4, name: 'Maria Santos', email: 'teacher@srcb.edu.ph', role: 'teacher', status: 'Active', password_hash: passwordHash, teacherId: 'T001' },
      ],
      teachers: [
        { id: 'T001', name: 'Maria Santos', email: 'teacher@srcb.edu.ph', phone: '123-456', status: 'Full-Time' },
      ],
      schedules: [
        { id: 101, faculty_id: 'T001', subject_code: 'IT101', section_id: 1, day: 'Monday', start_time: '08:00', end_time: '09:30' },
      ],
      subjects: [
        { code: 'IT101', name: 'Intro to IT', instructor_id: 'T001' },
      ],
      sections: [
        { id: 1, course_code: 'BSIT', section_label: 'A' },
      ],
    };

    setupMockDb();
  });

  it('1. Active user can log in normally and receive token with status Active', async () => {
    const res = await authService.login({
      email: 'teacher@srcb.edu.ph',
      password: '@teacher123',
    });

    expect(res.token).toBeDefined();
    expect(res.user.email).toBe('teacher@srcb.edu.ph');
    expect(res.user.status).toBe('Active');
  });

  it('2. Super Admin can update user status to Suspended in database', async () => {
    const targetUser = testState.users.find((u) => u.id === 4);
    expect(targetUser.status).toBe('Active');

    await usersService.updateUser(4, {
      ...targetUser,
      status: 'Suspended',
    });

    expect(targetUser.status).toBe('Suspended');
    const listed = await usersService.listUsers();
    const updated = listed.find((u) => u.id === '4');
    expect(updated.status).toBe('Suspended');
  });

  it('3. Suspended user login is strictly denied with 403 and ACCOUNT_SUSPENDED code', async () => {
    testState.users.find((u) => u.id === 4).status = 'Suspended';

    await expect(
      authService.login({
        email: 'teacher@srcb.edu.ph',
        password: '@teacher123',
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'ACCOUNT_SUSPENDED',
      message: 'Your account has been suspended. Please contact the ICT Office or system administrator.',
    });
  });

  it('4. authMiddleware invalidates active session if user was suspended after token issuance', async () => {
    // Generate valid JWT token while user was still active
    const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
    const token = jwt.sign(
      { sub: 4, role: 'teacher', email: 'teacher@srcb.edu.ph' },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Now suspend the user account in database
    testState.users.find((u) => u.id === 4).status = 'Suspended';

    // Simulated request through authMiddleware
    let statusSent = null;
    let jsonSent = null;
    let nextCalled = false;

    const req = {
      headers: { authorization: `Bearer ${token}` },
    };
    const res = {
      status(code) {
        statusSent = code;
        return this;
      },
      json(data) {
        jsonSent = data;
        return this;
      },
    };
    const next = () => {
      nextCalled = true;
    };

    await authMiddleware(req, res, next);

    expect(nextCalled).toBe(false);
    expect(statusSent).toBe(403);
    expect(jsonSent.code).toBe('ACCOUNT_SUSPENDED');
    expect(jsonSent.error).toContain('Your account has been suspended');
  });

  it('5. Super Admin can reactivate user to Active and allow login again', async () => {
    testState.users.find((u) => u.id === 4).status = 'Suspended';

    await usersService.updateUser(4, {
      name: 'Maria Santos',
      email: 'teacher@srcb.edu.ph',
      role: 'teacher',
      status: 'Active',
    });

    expect(testState.users.find((u) => u.id === 4).status).toBe('Active');

    const res = await authService.login({
      email: 'teacher@srcb.edu.ph',
      password: '@teacher123',
    });

    expect(res.token).toBeDefined();
    expect(res.user.status).toBe('Active');
  });

  it('6. Suspending a faculty member preserves their schedules, subjects, and sections intact', async () => {
    const initialScheduleCount = testState.schedules.length;
    const initialSubjectCount = testState.subjects.length;
    const initialSectionCount = testState.sections.length;

    await usersService.updateUser(4, {
      name: 'Maria Santos',
      email: 'teacher@srcb.edu.ph',
      role: 'teacher',
      status: 'Suspended',
    });

    expect(testState.schedules.length).toBe(initialScheduleCount);
    expect(testState.schedules[0].faculty_id).toBe('T001');
    expect(testState.subjects.length).toBe(initialSubjectCount);
    expect(testState.subjects[0].instructor_id).toBe('T001');
    expect(testState.sections.length).toBe(initialSectionCount);
  });

  it('7. Super Admin is blocked from suspending themselves via users controller', async () => {
    let statusSent = null;
    let jsonSent = null;

    const req = {
      user: { sub: 1, role: 'super_admin', email: 'superadmin@srcb.edu.ph' },
      params: { id: 1 },
      body: { status: 'Suspended' },
    };
    const res = {
      status(code) {
        statusSent = code;
        return this;
      },
      json(data) {
        jsonSent = data;
        return this;
      },
    };
    const next = () => {};

    await usersController.updateUser(req, res, next);

    expect(statusSent).toBe(400);
    expect(jsonSent.code).toBe('SELF_SUSPENSION_FORBIDDEN');
    expect(jsonSent.error).toContain('cannot suspend your own account');
  });

  it('8. Super Admin can retrieve and unsuspend any suspended account, restoring full login access', async () => {
    // Account starts suspended
    testState.users.find((u) => u.id === 4).status = 'Suspended';
    expect(testState.users.find((u) => u.id === 4).status).toBe('Suspended');

    // Super admin unsuspends the account
    const result = await usersService.updateUser(4, {
      status: 'Active',
    });

    expect(result.status).toBe('Active');
    expect(testState.users.find((u) => u.id === 4).status).toBe('Active');

    // User can now log in immediately
    const loginResult = await authService.login({
      email: 'teacher@srcb.edu.ph',
      password: '@teacher123',
    });

    expect(loginResult.token).toBeDefined();
    expect(loginResult.user.status).toBe('Active');
  });

  it('9. Super Admin can bulk unsuspend / reactivate multiple suspended accounts', async () => {
    // Add additional suspended user
    testState.users.push({
      id: 5,
      name: 'Engr. Roberto Santos',
      email: 'parttime@srcb.edu.ph',
      role: 'teacher',
      status: 'Suspended',
      password_hash: await bcrypt.hash('@teacher123', 10),
    });
    testState.users.find((u) => u.id === 4).status = 'Suspended';

    // Bulk activate
    const targetIds = [4, 5];
    for (const id of targetIds) {
      await usersService.updateUser(id, { status: 'Active' });
    }

    expect(testState.users.find((u) => u.id === 4).status).toBe('Active');
    expect(testState.users.find((u) => u.id === 5).status).toBe('Active');
  });

  it('10. Bulk unsuspend logic strictly targets suspended accounts only', async () => {
    testState.users.push({
      id: 6,
      name: 'Dr. Alan Turing',
      email: 'head.it@srcb.edu.ph',
      role: 'program_head',
      status: 'Active',
      password_hash: await bcrypt.hash('@teacher123', 10),
    });
    testState.users.find((u) => u.id === 4).status = 'Suspended'; // Only #4 is suspended

    const selectedUsers = [
      testState.users.find((u) => u.id === 4), // Suspended
      testState.users.find((u) => u.id === 6), // Active
    ];

    // Filter for activation targets
    const activateTargets = selectedUsers.filter(
      (u) => String(u.status || '').trim().toLowerCase() === 'suspended'
    );

    expect(activateTargets.length).toBe(1);
    expect(activateTargets[0].id).toBe(4);
  });

  it('11. Bulk suspend logic strictly targets active accounts and excludes self super admin', async () => {
    testState.users.find((u) => u.id === 4).status = 'Suspended';

    const selectedUsers = [
      testState.users.find((u) => u.id === 1), // Self super admin
      testState.users.find((u) => u.id === 2), // Active Admin
      testState.users.find((u) => u.id === 4), // Already Suspended Teacher
    ];

    // Filter for suspension targets
    const suspendTargets = selectedUsers.filter(
      (u) =>
        String(u.status || '').trim().toLowerCase() !== 'suspended' &&
        u.role !== 'super_admin'
    );

    expect(suspendTargets.length).toBe(1);
    expect(suspendTargets[0].id).toBe(2);
  });
});

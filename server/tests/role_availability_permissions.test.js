import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('../utils/db');
const { facultyService } = require('../services/faculty.service');
const { usersService } = require('../services/users.service');
const { schedulesService } = require('../services/schedules.service');
const facultyController = require('../controllers/faculty.controller');
const usersController = require('../controllers/users.controller');

let testState = {
  users: [
    { id: 1, name: 'Super Admin', email: 'superadmin@srcb.edu.ph', role: 'super_admin' },
    { id: 2, name: 'College Admin', email: 'admin@srcb.edu.ph', role: 'admin' },
    { id: 3, name: 'Dr. Alan Turing', email: 'programhead@srcb.edu.ph', role: 'program_head' },
    { id: 4, name: 'Maria Santos', email: 'teacher@srcb.edu.ph', role: 'teacher' },
    { id: 5, name: 'Marco Sabuero', email: 'parttime@srcb.edu.ph', role: 'teacher' },
  ],
  teachers: [
    { id: 'T001', name: 'Maria Santos', email: 'teacher@srcb.edu.ph', phone: '123', status: 'Full-Time', program_major_id: 1 },
    { id: 'FAC-003', name: 'Marco Sabuero', email: 'parttime@srcb.edu.ph', phone: '456', status: 'Part-Time', program_major_id: 1 },
  ],
  teacher_availability: [
    { id: 1, teacher_id: 'FAC-003', day_of_week: 'Monday', start_time: '08:00:00', end_time: '12:00:00' },
  ],
  program_majors: [
    { id: 1, code: 'BSIT', name: 'Bachelor of Science in Information Technology', program_code: 'ITP', program_head_id: 3 },
  ],
  schedules: [],
  subjects: [
    { code: 'CS101', name: 'Intro to Programming', units: 3, lecture_hours: 2, lab_hours: 0, program_code: 'ITP', instructor_id: 'FAC-003' },
  ],
  sections: [
    { id: 1, course_code: 'BSIT', year_level: 1, section_label: 'A', students: 30 },
  ],
  rooms: [
    { number: 'COL-101', capacity: 40, building: 'College Building', type: 'Lecture', status: 'active' },
  ],
};

function setupMockDb() {
  db.setQueryExecutor(async (sql, params = []) => {
    const s = String(sql).replace(/\s+/g, ' ').trim();

    if (s.includes('FROM users') && (s.includes('email = ?') || s.includes('LOWER(TRIM(email)) = ?'))) {
      const email = String(params[0] || '').toLowerCase();
      const user = testState.users.find((u) => u.email.toLowerCase() === email);
      return user ? [user] : [];
    }

    if (s.includes('FROM users') && s.includes('id = ?')) {
      const id = params[0];
      const user = testState.users.find((u) => u.id === Number(id));
      return user ? [user] : [];
    }

    if (s.includes('SELECT id, name, email, role, created_at FROM users') || s.includes('FROM users ORDER BY')) {
      return testState.users.map((u) => ({ ...u, created_at: '2026-08-23' }));
    }

    if (s.includes('INSERT INTO users')) {
      const [name, email, hash, role] = params;
      const newId = testState.users.length + 1;
      const newUser = { id: newId, name, email, role };
      testState.users.push(newUser);
      return [{ insertId: newId }];
    }

    if (s.includes('UPDATE users SET')) {
      const email = params[params.length - 1];
      const user = testState.users.find((u) => u.email === email || u.id === Number(email));
      if (user) {
        if (params[0]) user.name = params[0];
      }
      return [{ affectedRows: 1 }];
    }

    if (s.includes('DELETE FROM users WHERE id = ?')) {
      const id = Number(params[0]);
      testState.users = testState.users.filter((u) => u.id !== id);
      return [{ affectedRows: 1 }];
    }

    if (s.includes('FROM teachers') && (s.includes('id = ?') || s.includes('LOWER(email) = LOWER(?)'))) {
      const idOrEmail = String(params[0] || '').toLowerCase();
      const t = testState.teachers.find(
        (x) => x.id.toLowerCase() === idOrEmail || (x.email && x.email.toLowerCase() === idOrEmail)
      );
      return t ? [t] : [];
    }

    if (s.includes('SELECT t.id, t.name, t.email, t.phone, t.status, t.program_major_id') && s.includes('FROM teachers t')) {
      return testState.teachers.map((t) => ({ ...t, program_major_name: 'BSIT', program_major_code: 'BSIT' }));
    }

    if (s.includes('FROM teacher_availability') && s.includes('teacher_id IN')) {
      return testState.teacher_availability;
    }

    if (s.includes('FROM teacher_availability') && s.includes('teacher_id = ?')) {
      const tid = params[0];
      return testState.teacher_availability.filter((a) => a.teacher_id === tid);
    }

    if (s.includes('DELETE FROM teacher_availability WHERE teacher_id = ?')) {
      const tid = params[0];
      testState.teacher_availability = testState.teacher_availability.filter((a) => a.teacher_id !== tid);
      return [{ affectedRows: 1 }];
    }

    if (s.includes('DELETE FROM teachers WHERE id = ?')) {
      const tid = params[0];
      testState.teachers = testState.teachers.filter((t) => t.id !== tid);
      return [{ affectedRows: 1 }];
    }

    if (s.includes('UPDATE teachers SET')) {
      return [{ affectedRows: 1 }];
    }

    if (s.includes('INSERT INTO teacher_availability')) {
      const [tid, day, start, end] = params;
      testState.teacher_availability.push({
        id: testState.teacher_availability.length + 1,
        teacher_id: tid,
        day_of_week: day,
        start_time: start,
        end_time: end,
      });
      return [{ insertId: testState.teacher_availability.length }];
    }

    if (s.includes('FROM subjects') && (s.includes('code = ?') || s.includes('s.code = ?'))) {
      const sub = testState.subjects.find((x) => x.code === params[0]);
      return sub ? [sub] : [];
    }

    if (s.includes('FROM sections') && (s.includes('id = ?') || s.includes('sec.id = ?'))) {
      const sec = testState.sections.find((x) => x.id === Number(params[0]));
      return sec ? [sec] : [];
    }

    if (s.includes('FROM rooms') && (s.includes('number = ?') || s.includes('r.number = ?'))) {
      const rm = testState.rooms.find((x) => x.number === params[0]);
      return rm ? [rm] : [];
    }

    if (s.includes('FROM program_majors')) {
      if (s.includes('program_head_id = ?')) {
        return testState.program_majors.filter((m) => m.program_head_id === params[0]);
      }
      return testState.program_majors;
    }

    if (s.includes('FROM courses')) {
      return [{ code: 'BSIT', program_code: 'ITP' }];
    }

    if (s.includes('FROM schedules WHERE id != ?')) {
      return testState.schedules;
    }

    return [];
  });
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
}

describe('Role and Faculty Availability Permissions', () => {
  beforeEach(() => {
    setupMockDb();
  });

  it('Teachers cannot manage faculty profiles (returns 403 UNAUTHORIZED_ROLE)', async () => {
    const req = {
      user: {
        sub: 5,
        role: 'teacher',
        email: 'parttime@srcb.edu.ph',
        teacherId: 'FAC-003',
      },
      params: { id: 'FAC-003' },
      body: {
        name: 'Changed Name',
      },
    };
    const res = mockRes();
    await facultyController.updateFaculty(req, res, (err) => {
      if (err) throw err;
    });

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('UNAUTHORIZED_ROLE');
  });

  it('Admin must NOT manage users (returns 403 Forbidden)', async () => {
    const adminUser = { sub: 2, role: 'admin', email: 'admin@srcb.edu.ph' };

    // listUsers
    const resList = mockRes();
    await usersController.listUsers({ user: adminUser }, resList, () => {});
    expect(resList.statusCode).toBe(403);

    // createUser
    const resCreate = mockRes();
    await usersController.createUser(
      { user: adminUser, body: { name: 'Test', email: 'test@srcb.edu.ph', role: 'teacher' } },
      resCreate,
      () => {}
    );
    expect(resCreate.statusCode).toBe(403);

    // updateUser
    const resUpdate = mockRes();
    await usersController.updateUser(
      { user: adminUser, params: { id: '1' }, body: { name: 'New Name' } },
      resUpdate,
      () => {}
    );
    expect(resUpdate.statusCode).toBe(403);

    // deleteUser
    const resDelete = mockRes();
    await usersController.deleteUser(
      { user: adminUser, params: { id: '1' } },
      resDelete,
      () => {}
    );
    expect(resDelete.statusCode).toBe(403);
  });

  it('Super Admin CAN manage users', async () => {
    const superAdminUser = { sub: 1, role: 'super_admin', email: 'superadmin@srcb.edu.ph' };

    // listUsers
    const resList = mockRes();
    await usersController.listUsers({ user: superAdminUser }, resList, () => {});
    expect(resList.statusCode).toBe(200);
    expect(Array.isArray(resList.body.data)).toBe(true);

    // createUser
    const resCreate = mockRes();
    await usersController.createUser(
      { user: superAdminUser, body: { name: 'New Officer', email: 'newofficer@srcb.edu.ph', role: 'admin' } },
      resCreate,
      () => {}
    );
    expect(resCreate.statusCode).toBe(201);
    expect(resCreate.body.data.email).toBe('newofficer@srcb.edu.ph');
  });

  it('Schedule validation allows flexible scheduling without availability window constraints', async () => {
    testState.teacher_availability = [
      { id: 1, teacher_id: 'FAC-003', day_of_week: 'Monday', start_time: '08:00:00', end_time: '12:00:00' },
    ];

    // Attempting schedule on Monday 08:00-10:00 -> valid
    await expect(
      schedulesService.validateSchedulePayload(
        {
          day: 'Monday',
          start_time: '08:00:00',
          end_time: '10:00:00',
          faculty_id: 'FAC-003',
          subject_code: 'CS101',
          section_id: 1,
          room_number: 'COL-101',
        },
        { role: 'admin' }
      )
    ).resolves.not.toThrow();

    // Attempting schedule on Tuesday (previously outside availability window) -> now valid
    await expect(
      schedulesService.validateSchedulePayload(
        {
          day: 'Tuesday',
          start_time: '08:00:00',
          end_time: '10:00:00',
          faculty_id: 'FAC-003',
          subject_code: 'CS101',
          section_id: 1,
          room_number: 'COL-101',
        },
        { role: 'admin' }
      )
    ).resolves.not.toThrow();
  });

  it('Admin cannot delete faculty (returns 403 UNAUTHORIZED_ROLE)', async () => {
    const adminUser = { sub: 2, role: 'admin', email: 'admin@srcb.edu.ph' };
    const res = mockRes();
    await facultyController.deleteFaculty(
      { user: adminUser, params: { id: 'T001' } },
      res,
      () => {}
    );
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('UNAUTHORIZED_ROLE');
    expect(res.body.error).toContain('Only the Super Administrator can delete faculty records');
  });

  it('Super Admin CAN delete faculty records', async () => {
    const superAdminUser = { sub: 1, role: 'super_admin', email: 'superadmin@srcb.edu.ph' };
    const res = mockRes();
    await facultyController.deleteFaculty(
      { user: superAdminUser, params: { id: 'T001' } },
      res,
      () => {}
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Faculty member deleted successfully');
  });

  it('Admin cannot edit teacher profiles (returns 403 UNAUTHORIZED_ROLE)', async () => {
    const adminUser = { sub: 2, role: 'admin', email: 'admin@srcb.edu.ph' };
    const res = mockRes();
    await facultyController.updateFaculty(
      { user: adminUser, params: { id: 'FAC-003' }, body: { name: 'Changed Name', phone: '09999999999' } },
      res,
      () => {}
    );
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('UNAUTHORIZED_ROLE');
    expect(res.body.error).toContain('Only Super Administrators can edit teacher profiles');
  });



  it('Super Admin CAN edit teacher profiles (returns 200)', async () => {
    const superAdminUser = { sub: 1, role: 'super_admin', email: 'superadmin@srcb.edu.ph' };
    const res = mockRes();
    await facultyController.updateFaculty(
      { user: superAdminUser, params: { id: 'FAC-003' }, body: { name: 'Marco Updated', phone: '09123456789' } },
      res,
      () => {}
    );
    expect(res.statusCode).toBe(200);
  });

  it('Admin cannot create/register faculty (returns 403 UNAUTHORIZED_ROLE)', async () => {
    const adminUser = { sub: 2, role: 'admin', email: 'admin@srcb.edu.ph' };
    const res = mockRes();
    await facultyController.createFaculty(
      { user: adminUser, body: { id: 'FAC-NEW', name: 'New Faculty', email: 'new@srcb.edu.ph' } },
      res,
      () => {}
    );
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('UNAUTHORIZED_ROLE');
    expect(res.body.error).toContain('Only the Super Administrator can register faculty accounts');
  });
});

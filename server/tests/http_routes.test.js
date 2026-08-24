import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const http = require('http');
const { createApp } = require('../app');
const db = require('../utils/db');
const bcrypt = require('bcrypt');

let server;
let baseUrl;

const mockData = {
  users: [],
  teachers: [
    { id: 'T001', name: 'Maria Santos', email: 'admin@srcb.edu.ph', phone: '123-456', status: 'Full-Time', program_major_id: 1 },
  ],
  schedules: [
    {
      id: 1,
      day: 'Monday',
      start_time: '08:00:00',
      end_time: '10:00:00',
      subject_code: 'CS101',
      section_id: 1,
      faculty_id: 'T001',
      room_number: 'R101',
      color: '#2563eb',
    },
  ],
  subjects: [
    { code: 'CS101', name: 'Intro to CS', program_code: 'ITP', instructor_id: 'T001', lab_hours: 0, lecture_hours: 3 },
  ],
  sections: [
    { id: 1, course_code: 'BSIT', year_level: 1, section_label: 'A', students: 30 },
  ],
  rooms: [
    { number: 'R101', capacity: 40, building: 'Main Hall', type: 'Lecture', status: 'Available' },
  ],
  program_majors: [
    { id: 1, code: 'BSIT', name: 'BS Information Technology', program_code: 'ITP', program_head_id: 1 },
  ],
  programs: [
    { code: 'ITP', name: 'Information Technology Program' },
  ],
  teacher_availability: [],
  exam_schedules: [],
};

beforeAll(async () => {
  const hash = await bcrypt.hash('@admin123', 10);
  mockData.users = [
    { id: 1, name: 'System Administrator', email: 'admin@srcb.edu.ph', password_hash: hash, role: 'admin' },
  ];

  db.setQueryExecutor(async (sql, params = []) => {
    const s = String(sql).replace(/\s+/g, ' ').trim();

    if (s.includes('FROM users') && (s.includes('email = ?') || s.includes('LOWER(TRIM(email)) = ?'))) {
      const email = String(params[0] || '').toLowerCase();
      const u = mockData.users.find((x) => x.email.toLowerCase() === email);
      return u ? [u] : [];
    }

    if (s.includes('FROM users WHERE id = ?')) {
      const u = mockData.users.find((x) => x.id === Number(params[0]));
      return u ? [u] : [];
    }

    if (s.includes('FROM schedules sc') || s.includes('FROM schedules WHERE sc.id = ?')) {
      return mockData.schedules.map((item) => ({
        ...item,
        subject_name: 'Intro to CS',
        program_code: 'ITP',
        faculty_name: 'Maria Santos',
        faculty_status: 'Full-Time',
        building: 'Main Hall',
        room_type: 'Lecture',
        room_capacity: 40,
        section_name: 'BSIT 1-A',
        section_course_code: 'BSIT',
        section_students: 30,
      }));
    }

    if (s.includes('FROM teachers') && (s.includes('email = ?') || s.includes('LOWER(email) = LOWER(?)'))) {
      const email = String(params[0] || '').toLowerCase();
      const t = mockData.teachers.find((x) => x.email.toLowerCase() === email);
      return t ? [t] : [];
    }

    if (s.includes('FROM teachers') && s.includes('id = ?')) {
      const t = mockData.teachers.find((x) => x.id === params[0]);
      return t ? [t] : [];
    }

    if (s.includes('FROM subjects WHERE code = ?') || s.includes('SELECT code FROM subjects WHERE code = ?')) {
      const sub = mockData.subjects.find((x) => x.code === params[0]);
      return sub ? [sub] : [];
    }

    if (s.includes('FROM rooms WHERE number = ?') || s.includes('SELECT number FROM rooms WHERE number = ?')) {
      const r = mockData.rooms.find((x) => x.number === params[0]);
      return r ? [r] : [];
    }

    if (s.includes('FROM sections WHERE id = ?') || s.includes('SELECT id FROM sections WHERE id = ?')) {
      const sec = mockData.sections.find((x) => x.id === Number(params[0]));
      return sec ? [sec] : [];
    }

    if (s.includes('FROM program_majors')) {
      return mockData.program_majors;
    }

    if (s.includes('FROM courses')) {
      return [{ code: 'BSIT', program_code: 'ITP' }];
    }

    if (s.includes('FROM schedules WHERE id != ?')) {
      return mockData.schedules;
    }

    if (s.includes('FROM teacher_availability WHERE teacher_id = ?')) {
      return mockData.teacher_availability;
    }

    if (s.includes('FROM exam_schedules')) {
      return mockData.exam_schedules;
    }

    if (s.includes('INSERT INTO schedules')) {
      const newId = mockData.schedules.length + 1;
      mockData.schedules.push({
        id: newId,
        day: params[0],
        start_time: params[1],
        end_time: params[2],
        subject_code: params[3],
        section_id: params[4],
        faculty_id: params[5],
        room_number: params[6],
        color: params[7],
      });
      return [{ insertId: newId }];
    }

    return [];
  });

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  db.setQueryExecutor(null);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('HTTP Endpoints (/api/auth, /api/schedules, /api/reports)', () => {
  let authToken = '';

  it('GET /health returns ok: true', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('POST /api/auth/login logs in and returns JWT token and user info', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@srcb.edu.ph', password: '@admin123' }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('token');
    expect(json).toHaveProperty('user');
    expect(json.user.email).toBe('admin@srcb.edu.ph');
    expect(json.user.role).toBe('admin');
    authToken = json.token;
  });

  it('GET /api/auth/me returns current user info with valid token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('user');
    expect(json.user.email).toBe('admin@srcb.edu.ph');
  });

  it('GET /api/schedules returns class schedule list', async () => {
    const res = await fetch(`${baseUrl}/api/schedules`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('data');
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0].subjectCode).toBe('CS101');
  });

  it('POST /api/schedules validates and creates a new schedule', async () => {
    const res = await fetch(`${baseUrl}/api/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        day: 'Tuesday',
        time: '08:00-10:00',
        subjectCode: 'CS101',
        facultyId: 'T001',
        room: 'R101',
        sectionId: '1',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty('data');
    expect(json.data.day).toBe('Tuesday');
  });
});

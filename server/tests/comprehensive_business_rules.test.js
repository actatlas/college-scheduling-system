import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('../utils/db');
const { schedulesService } = require('../services/schedules.service');
const { examSchedulesService } = require('../services/examSchedules.service');
const { facultyService } = require('../services/faculty.service');
const { usersService } = require('../services/users.service');
const coursesController = require('../controllers/courses.controller');
const programsController = require('../controllers/programs.controller');
const roomsController = require('../controllers/rooms.controller');
const subjectsController = require('../controllers/subjects.controller');
const sectionsController = require('../controllers/sections.controller');

let state = {
  users: [
    { id: 1, name: 'Super Admin', email: 'superadmin@srcb.edu.ph', role: 'super_admin' },
    { id: 2, name: 'Admin', email: 'admin@srcb.edu.ph', role: 'admin' },
    { id: 3, name: 'Dr. Alan Turing', email: 'ph_it@srcb.edu.ph', role: 'program_head' },
    { id: 4, name: 'Maria Santos', email: 'maria@srcb.edu.ph', role: 'teacher' },
    { id: 5, name: 'Roberto Parttime', email: 'roberto@srcb.edu.ph', role: 'teacher' },
  ],
  teachers: [
    { id: 'T_FULL', name: 'Maria Santos', email: 'maria@srcb.edu.ph', status: 'Full-Time', program_major_id: 1 },
    { id: 'T_OTHER', name: 'John Doe', email: 'john@srcb.edu.ph', status: 'Full-Time', program_major_id: 1 },
    { id: 'T_PART', name: 'Roberto Parttime', email: 'roberto@srcb.edu.ph', status: 'Part-Time', program_major_id: 1 },
    { id: 'T_PART_EMPTY', name: 'New Parttime', email: 'newpart@srcb.edu.ph', status: 'Part-Time', program_major_id: 1 },
  ],
  programs: [
    { code: 'ITP', name: 'Information Technology Program' },
    { code: 'CJEP', name: 'Criminology Program' },
  ],
  program_majors: [
    { id: 1, code: 'BSIT', name: 'BS Information Technology', program_code: 'ITP', program_head_id: 3 },
  ],
  courses: [
    { code: 'BSIT', name: 'BS Information Technology', program_code: 'ITP' },
    { code: 'BSCRIM', name: 'BS Criminology', program_code: 'CJEP' },
  ],
  subjects: [
    { code: 'IT101', name: 'Computer Programming 1', program_code: 'ITP', instructor_id: 'T_FULL', lab_hours: 3, lecture_hours: 2 },
    { code: 'IT102', name: 'Data Structures', program_code: 'ITP', instructor_id: 'T_PART', lab_hours: 0, lecture_hours: 3 },
    { code: 'CRIM101', name: 'Intro to Criminology', program_code: 'CJEP', instructor_id: null, lab_hours: 0, lecture_hours: 3 },
  ],
  sections: [
    { id: 1, course_code: 'BSIT', year_level: 1, section_label: 'A', students: 30 },
    { id: 2, course_code: 'BSIT', year_level: 1, section_label: 'B', students: 50 },
    { id: 3, course_code: 'BSCRIM', year_level: 1, section_label: 'A', students: 35 },
  ],
  rooms: [
    { number: 'LAB-101', capacity: 40, building: 'Tech Hall', type: 'Laboratory', status: 'Available' },
    { number: 'LEC-201', capacity: 45, building: 'Main Hall', type: 'Lecture', status: 'Available' },
    { number: 'LEC-SMALL', capacity: 25, building: 'Annex', type: 'Lecture', status: 'Available' },
    { number: 'MAINT-301', capacity: 50, building: 'Main Hall', type: 'Lecture', status: 'Maintenance' },
  ],
  schedules: [],
  teacher_availability: [],
  exam_schedules: [],
};

function resetState() {
  state.schedules = [
    {
      id: 1,
      day: 'Monday',
      start_time: '08:00:00',
      end_time: '11:00:00',
      subject_code: 'IT101',
      section_id: 1,
      faculty_id: 'T_FULL',
      room_number: 'LAB-101',
      color: '#2563eb',
    },
  ];
  state.teacher_availability = [
    { id: 1, teacher_id: 'T_PART', day_of_week: 'Tuesday', start_time: '08:00:00', end_time: '12:00:00' },
  ];
  state.exam_schedules = [
    {
      id: 1,
      term: 'Midterm',
      exam_date: '2026-10-20',
      start_time: '08:00:00',
      end_time: '10:00:00',
      subject_code: 'IT101',
      section_names: '["BSIT 1-A"]',
      room_number: 'LAB-101',
      building: 'Tech Hall',
      proctor_id: 'T_FULL',
      proctor_name: 'Maria Santos',
      program_code: 'ITP',
      color: '#2563eb',
    },
  ];
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

const mockQueryExecutor = async (sql, params = []) => {
  const s = String(sql).replace(/\s+/g, ' ').trim();

  if (s.includes('FROM schedules sc') || s.includes('FROM schedules WHERE sc.id = ?')) {
    let list = [...state.schedules];
    if (s.includes('WHERE sc.id = ?') || s.includes('sc.id = ?')) {
      const id = params[0];
      list = list.filter((item) => item.id === Number(id));
    }
    return list.map((item) => {
      const sub = state.subjects.find((x) => x.code === item.subject_code);
      const teacher = state.teachers.find((x) => x.id === item.faculty_id);
      const room = state.rooms.find((x) => x.number === item.room_number);
      const sec = state.sections.find((x) => x.id === item.section_id);
      return {
        ...item,
        subject_name: sub?.name || item.subject_code,
        program_code: sub?.program_code || 'ITP',
        faculty_name: teacher?.name || '',
        faculty_status: teacher?.status || 'Full-Time',
        building: room?.building || 'Main Hall',
        room_type: room?.type || 'Lecture',
        room_capacity: room?.capacity || 40,
        section_name: sec ? `${sec.course_code} ${sec.year_level}-${sec.section_label}` : '',
        section_course_code: sec?.course_code || 'BSIT',
        section_students: sec?.students || 30,
      };
    });
  }

  if (s.includes('FROM teachers') && (s.includes('email = ?') || s.includes('LOWER(TRIM(email)) = ?'))) {
    const email = String(params[0] || '').toLowerCase();
    const found = state.teachers.find((t) => t.email.toLowerCase() === email);
    return found ? [found] : [];
  }

  if (s.includes('FROM teachers') && (s.includes('t.id = ?') || s.includes('id = ?'))) {
    const t = state.teachers.find((x) => x.id === params[0]);
    return t ? [t] : [];
  }

  if (s.includes('SELECT pm.id, pm.code, pm.name, pm.program_code') || s.includes('SELECT program_code, code FROM program_majors')) {
    const uid = params[0];
    return state.program_majors.filter((m) => m.program_head_id === uid);
  }

  if (s.includes('FROM courses WHERE code = ? AND program_code = ?')) {
    const [cCode, pCode] = params;
    const found = state.courses.find((c) => c.code === cCode && c.program_code === pCode);
    return found ? [found] : [];
  }

  if (s.includes('FROM program_majors WHERE code = ? AND program_code = ?')) {
    const [cCode, pCode] = params;
    const found = state.program_majors.find((m) => m.code === cCode && m.program_code === pCode);
    return found ? [found] : [];
  }

  if (s.includes('FROM exam_schedules es') || s.includes('FROM exam_schedules')) {
    let list = [...state.exam_schedules];
    if (s.includes('WHERE id != ?')) {
      list = list.filter((e) => e.id !== params[0]);
    }
    if (s.includes('WHERE id = ?')) {
      list = list.filter((e) => e.id === Number(params[0]));
    }
    return list.map((e) => ({
      ...e,
      subject_name: 'Computer Programming 1',
    }));
  }

  if (s.includes('INSERT INTO schedules')) {
    const newSched = {
      id: state.schedules.length + 1,
      day: params[0],
      start_time: params[1],
      end_time: params[2],
      subject_code: params[3],
      section_id: params[4],
      faculty_id: params[5],
      room_number: params[6],
      color: params[7] || '#2563eb',
    };
    state.schedules.push(newSched);
    return [{ insertId: newSched.id }];
  }

  if (s.includes('INSERT INTO exam_schedules')) {
    const newExam = {
      id: state.exam_schedules.length + 1,
      term: params[0],
      exam_date: params[1],
      start_time: params[2],
      end_time: params[3],
      subject_code: params[4],
      section_names: params[5],
      room_number: params[6],
      building: params[7],
      proctor_id: params[8],
      proctor_name: params[9],
      program_code: params[10],
      color: params[11],
    };
    state.exam_schedules.push(newExam);
    return [{ insertId: newExam.id }];
  }

  if (s.includes('UPDATE schedules SET')) {
    const id = params[params.length - 1];
    const sched = state.schedules.find((x) => x.id === Number(id));
    if (sched) {
      sched.day = params[0];
      sched.start_time = params[1];
      sched.end_time = params[2];
      sched.subject_code = params[3];
      sched.section_id = params[4];
      sched.faculty_id = params[5];
      sched.room_number = params[6];
      sched.color = params[7];
    }
    return [{ affectedRows: 1 }];
  }

  if (s.includes('FROM schedules WHERE id != ?')) {
    return state.schedules.filter((x) => x.id !== Number(params[0]));
  }

  if (s.includes('SELECT code, name, program_code, lab_hours, lecture_hours FROM subjects WHERE code = ?') || s.includes('SELECT code FROM subjects WHERE code = ?')) {
    const sub = state.subjects.find((x) => x.code === params[0]);
    return sub ? [sub] : [];
  }

  if (s.includes('SELECT number, capacity, building, type, status FROM rooms WHERE number = ?') || s.includes('SELECT number FROM rooms WHERE number = ?')) {
    const r = state.rooms.find((x) => x.number === params[0]);
    return r ? [r] : [];
  }

  if (s.includes('SELECT id, course_code, year_level, section_label, students FROM sections WHERE id = ?') || s.includes('SELECT id FROM sections WHERE id = ?')) {
    const sec = state.sections.find((x) => x.id === Number(params[0]));
    return sec ? [sec] : [];
  }

  if (s.includes('FROM teacher_availability WHERE teacher_id = ?')) {
    return state.teacher_availability.filter((a) => a.teacher_id === params[0]);
  }

  if (s.includes('DELETE FROM schedules WHERE id = ?')) {
    state.schedules = state.schedules.filter((s) => s.id !== Number(params[0]));
    return [{ affectedRows: 1 }];
  }

  if (s.includes('SELECT id, course_code, year_level, section_label, students FROM sections ORDER BY id ASC')) {
    return state.sections;
  }

  if (s.includes('SELECT code, name, program_code, instructor_id, lecture_hours, lab_hours FROM subjects ORDER BY code ASC')) {
    return state.subjects;
  }

  if (s.includes('SELECT number, capacity, building, type FROM rooms WHERE status = "Available"')) {
    return state.rooms.filter((r) => r.status === 'Available');
  }

  if (s.includes('SELECT id, name, status FROM teachers ORDER BY id ASC')) {
    return state.teachers;
  }

  return [];
};

beforeEach(() => {
  resetState();
  db.setQueryExecutor(mockQueryExecutor);
});

afterAll(() => {
  db.setQueryExecutor(null);
});

describe('Comprehensive SRCB Business Logic & Authorization Verification', () => {
  const superAdmin = { sub: 1, role: 'super_admin', email: 'superadmin@srcb.edu.ph' };
  const admin = { sub: 2, role: 'admin', email: 'admin@srcb.edu.ph' };
  const progHeadIT = { sub: 3, role: 'program_head', email: 'ph_it@srcb.edu.ph', program: 'BSIT', programCode: 'ITP' };
  const teacherMaria = { sub: 4, role: 'teacher', email: 'maria@srcb.edu.ph', teacherId: 'T_FULL' };

  it('1. Teacher conflict rejected', async () => {
    // T_FULL already has class on Monday 08:00-11:00
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Monday',
          time: '09:00-10:30',
          subjectCode: 'IT102',
          facultyId: 'T_FULL',
          room: 'LEC-201',
          sectionId: '1',
        },
        admin
      )
    ).rejects.toMatchObject({
      code: 'FACULTY_CONFLICT',
      statusCode: 409,
    });
  });

  it('2. Room conflict rejected', async () => {
    // LAB-101 already booked Monday 08:00-11:00
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Monday',
          time: '10:00-11:30',
          subjectCode: 'IT102',
          facultyId: 'T_FULL',
          room: 'LAB-101',
          sectionId: '1',
        },
        admin
      )
    ).rejects.toMatchObject({
      code: 'ROOM_CONFLICT',
      statusCode: 409,
    });
  });

  it('3. Section conflict rejected', async () => {
    // Section 1 already booked Monday 08:00-11:00 with T_FULL in LAB-101
    // Adding another class for Section 1 on Monday 08:30-10:00 with available instructor T_OTHER in available room LEC-201
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Monday',
          time: '08:30-10:00',
          subjectCode: 'IT102',
          facultyId: 'T_OTHER',
          room: 'LEC-201',
          sectionId: '1',
        },
        admin
      )
    ).rejects.toMatchObject({
      code: 'SECTION_CONFLICT',
      statusCode: 409,
    });
  });

  it('4. Part-Time availability completely inside succeeds; outside or partial overlap fails', async () => {
    // T_PART availability: Tuesday 08:00-12:00
    // Success: Tuesday 09:00-11:00
    const sched = await schedulesService.createSchedule(
      {
        day: 'Tuesday',
        time: '09:00-11:00',
        subjectCode: 'IT102',
        facultyId: 'T_PART',
        room: 'LEC-201',
        sectionId: '1',
      },
      admin
    );
    expect(sched.id).toBeDefined();

    // Partial overlap: Tuesday 11:00-13:00 (extends beyond 12:00) -> fails
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Tuesday',
          time: '11:00-13:00',
          subjectCode: 'IT102',
          facultyId: 'T_PART',
          room: 'LEC-201',
          sectionId: '1',
        },
        admin
      )
    ).rejects.toMatchObject({
      code: 'FACULTY_UNAVAILABLE',
      statusCode: 409,
    });

    // Part-time faculty with no registered availability -> fails
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Wednesday',
          time: '08:00-10:00',
          subjectCode: 'IT102',
          facultyId: 'T_PART_EMPTY',
          room: 'LEC-201',
          sectionId: '1',
        },
        admin
      )
    ).rejects.toMatchObject({
      code: 'FACULTY_UNAVAILABLE',
      statusCode: 409,
    });
  });

  it('5. Full-Time availability respects standard vs admin configured availability', async () => {
    // T_FULL has no restricted availability configured -> can schedule standard slot
    const sched = await schedulesService.createSchedule(
      {
        day: 'Wednesday',
        time: '13:00-15:00',
        subjectCode: 'IT101',
        facultyId: 'T_FULL',
        room: 'LAB-101',
        sectionId: '1',
      },
      admin
    );
    expect(sched.facultyId).toBe('T_FULL');

    // If admin explicitly configured availability for T_FULL: Wednesday 08:00-12:00
    state.teacher_availability.push({
      id: 2,
      teacher_id: 'T_FULL',
      day_of_week: 'Wednesday',
      start_time: '08:00:00',
      end_time: '12:00:00',
    });

    // Wednesday 13:00-15:00 now falls outside configured availability -> fails
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Wednesday',
          time: '13:00-15:00',
          subjectCode: 'IT101',
          facultyId: 'T_FULL',
          room: 'LAB-101',
          sectionId: '1',
        },
        admin
      )
    ).rejects.toMatchObject({
      code: 'FACULTY_UNAVAILABLE',
      statusCode: 409,
    });
  });

  it('6. Room capacity: rejects room smaller than section headcount', async () => {
    // Section 2 has 50 students, LEC-SMALL has capacity 25
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Wednesday',
          time: '08:00-10:00',
          subjectCode: 'IT102',
          facultyId: 'T_FULL',
          room: 'LEC-SMALL',
          sectionId: '2',
        },
        admin
      )
    ).rejects.toMatchObject({
      code: 'ROOM_CAPACITY_EXCEEDED',
      statusCode: 409,
    });
  });

  it('7. Room type: rejects laboratory subject in a lecture-only room', async () => {
    // IT101 has lab_hours = 3, LEC-201 is Lecture room
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Wednesday',
          time: '08:00-11:00',
          subjectCode: 'IT101',
          facultyId: 'T_FULL',
          room: 'LEC-201',
          sectionId: '1',
        },
        admin
      )
    ).rejects.toMatchObject({
      code: 'ROOM_TYPE_MISMATCH',
      statusCode: 409,
    });
  });

  it('8. Room status: rejects room marked under Maintenance / Unavailable', async () => {
    // MAINT-301 is in 'Maintenance' status
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Thursday',
          time: '08:00-10:00',
          subjectCode: 'IT102',
          facultyId: 'T_FULL',
          room: 'MAINT-301',
          sectionId: '1',
        },
        admin
      )
    ).rejects.toMatchObject({
      code: 'ROOM_UNAVAILABLE',
      statusCode: 409,
    });
  });

  it('9. Invalid Subject-Section relationship rejected', async () => {
    // CRIM101 (CJEP) does not match section 1 (BSIT / ITP)
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Thursday',
          time: '08:00-10:00',
          subjectCode: 'CRIM101',
          facultyId: 'T_FULL',
          room: 'LEC-201',
          sectionId: '1',
        },
        admin
      )
    ).rejects.toMatchObject({
      code: 'INVALID_SUBJECT_SECTION_RELATIONSHIP',
      statusCode: 400,
    });
  });

  it('10. Invalid time ranges rejected', async () => {
    // start >= end
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Thursday',
          time: '11:00-09:00',
          subjectCode: 'IT102',
          facultyId: 'T_FULL',
          room: 'LEC-201',
          sectionId: '1',
        },
        admin
      )
    ).rejects.toMatchObject({
      code: 'INVALID_TIME_RANGE',
      statusCode: 400,
    });

    // Duration < 30 minutes
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Thursday',
          time: '08:00-08:15',
          subjectCode: 'IT102',
          facultyId: 'T_FULL',
          room: 'LEC-201',
          sectionId: '1',
        },
        admin
      )
    ).rejects.toMatchObject({
      code: 'INVALID_TIME_RANGE',
      statusCode: 400,
    });

    // Invalid day
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Funday',
          time: '08:00-10:00',
          subjectCode: 'IT102',
          facultyId: 'T_FULL',
          room: 'LEC-201',
          sectionId: '1',
        },
        admin
      )
    ).rejects.toMatchObject({
      code: 'INVALID_TIME_RANGE',
      statusCode: 400,
    });
  });

  it('11. Admin & Super Admin permissions across CRUD controllers', async () => {
    // Admin creates course -> succeeds
    const resCourse = mockRes();
    await coursesController.createCourse({ user: admin, body: { code: 'NEW_C', name: 'New Course' } }, resCourse, () => {});
    expect(resCourse.statusCode).toBe(201);

    // Teacher cannot create course -> 403 UNAUTHORIZED_ROLE
    const resTeacherCourse = mockRes();
    await coursesController.createCourse({ user: teacherMaria, body: { code: 'BAD_C', name: 'Bad Course' } }, resTeacherCourse, () => {});
    expect(resTeacherCourse.statusCode).toBe(403);
    expect(resTeacherCourse.body.code).toBe('UNAUTHORIZED_ROLE');

    // Teacher cannot create room -> 403 UNAUTHORIZED_ROLE
    const resTeacherRoom = mockRes();
    await roomsController.createRoom({ user: teacherMaria, body: { number: 'R-999' } }, resTeacherRoom, () => {});
    expect(resTeacherRoom.statusCode).toBe(403);

    // Super Admin can create sections
    const resSec = mockRes();
    await sectionsController.createSection({ user: superAdmin, body: { courseCode: 'BSIT', yearLevel: 1, sectionLabel: 'C' } }, resSec, () => {});
    expect(resSec.statusCode).toBe(201);
  });

  it('12. Program Head program scope isolation', async () => {
    // progHeadIT cannot create schedule for Criminology subject
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Friday',
          time: '08:00-10:00',
          subjectCode: 'CRIM101',
          facultyId: 'T_FULL',
          room: 'LEC-201',
          sectionId: '3',
        },
        progHeadIT
      )
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED_PROGRAM_ACCESS',
      statusCode: 403,
    });
  });

  it('13. Teacher read-only restrictions', async () => {
    // Teacher cannot create schedule
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Friday',
          time: '08:00-10:00',
          subjectCode: 'IT102',
          facultyId: 'T_FULL',
          room: 'LEC-201',
          sectionId: '1',
        },
        teacherMaria
      )
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED_ROLE',
      statusCode: 403,
    });

    // Teacher cannot update schedule
    await expect(
      schedulesService.updateSchedule(1, { day: 'Friday' }, teacherMaria)
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED_ROLE',
      statusCode: 403,
    });

    // Teacher cannot delete schedule
    await expect(
      schedulesService.deleteSchedule(1, teacherMaria)
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED_ROLE',
      statusCode: 403,
    });
  });

  it('14. Schedule update validation excludes self and detects new conflicts', async () => {
    // Updating schedule 1 keeping same slot -> succeeds (excludes self)
    const updated = await schedulesService.updateSchedule(
      1,
      {
        day: 'Monday',
        time: '08:00-11:00',
        subjectCode: 'IT101',
        facultyId: 'T_FULL',
        room: 'LAB-101',
        sectionId: '1',
        color: '#10b981',
      },
      admin
    );
    expect(updated.color).toBe('#10b981');

    // Add schedule 2 on Tuesday 08:00-10:00 in LEC-201
    state.schedules.push({
      id: 2,
      day: 'Tuesday',
      start_time: '08:00:00',
      end_time: '10:00:00',
      subject_code: 'IT102',
      section_id: 2,
      faculty_id: 'T_FULL',
      room_number: 'LEC-201',
      color: '#0284c7',
    });

    // Attempting to move schedule 1 to Tuesday 08:00-10:00 in LEC-201 -> conflicts with schedule 2
    await expect(
      schedulesService.updateSchedule(
        1,
        {
          day: 'Tuesday',
          time: '08:00-10:00',
          subjectCode: 'IT101',
          facultyId: 'T_FULL',
          room: 'LEC-201',
          sectionId: '1',
        },
        admin
      )
    ).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('15. Automatic generator validation and failure reporting', async () => {
    const report = await schedulesService.generateSchedules({ user: admin });
    expect(report).toHaveProperty('scheduled');
    expect(report).toHaveProperty('unscheduled');
    expect(report).toHaveProperty('conflictsAvoided');
    expect(Array.isArray(report.scheduled)).toBe(true);
  });

  it('16. Exam scheduling: detects section, room, and proctor conflicts', async () => {
    // Exam 1 is 2026-10-20 08:00-10:00 in LAB-101 with Proctor T_FULL and section ["BSIT 1-A"]
    // Room conflict on same date and time
    await expect(
      examSchedulesService.createExamSchedule(
        {
          term: 'Midterm',
          examDate: '2026-10-20',
          time: '09:00-11:00',
          subjectCode: 'IT102',
          room: 'LAB-101',
          proctorId: 'T_PART',
          synchronizedSections: ['BSIT 1-B'],
          program: 'ITP',
        },
        admin
      )
    ).rejects.toMatchObject({
      code: 'ROOM_CONFLICT',
      statusCode: 409,
    });

    // Proctor conflict on same date and time
    await expect(
      examSchedulesService.createExamSchedule(
        {
          term: 'Midterm',
          examDate: '2026-10-20',
          time: '08:30-10:30',
          subjectCode: 'IT102',
          room: 'LEC-201',
          proctorId: 'T_FULL',
          synchronizedSections: ['BSIT 1-B'],
          program: 'ITP',
        },
        admin
      )
    ).rejects.toMatchObject({
      code: 'PROCTOR_CONFLICT',
      statusCode: 409,
    });

    // Section conflict on same date and time
    await expect(
      examSchedulesService.createExamSchedule(
        {
          term: 'Midterm',
          examDate: '2026-10-20',
          time: '08:30-10:30',
          subjectCode: 'IT102',
          room: 'LEC-201',
          proctorId: 'T_PART',
          synchronizedSections: ['BSIT 1-A'],
          program: 'ITP',
        },
        admin
      )
    ).rejects.toMatchObject({
      code: 'SECTION_CONFLICT',
      statusCode: 409,
    });
  });
});

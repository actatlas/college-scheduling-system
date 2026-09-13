import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('../utils/db');
const { schedulesService } = require('../services/schedules.service');
const { examSchedulesService } = require('../services/examSchedules.service');

let tableData = {
  users: [
    { id: 1, name: 'System Administrator', email: 'admin@srcb.edu.ph', password_hash: '$2b$10$abc', role: 'admin' },
    { id: 2, name: 'Dr. Alan Turing', email: 'programhead@srcb.edu.ph', password_hash: '$2b$10$def', role: 'program_head' },
    { id: 3, name: 'Maria Santos', email: 'teacher@srcb.edu.ph', password_hash: '$2b$10$ghi', role: 'teacher' },
    { id: 4, name: 'Roberto Santos', email: 'roberto@srcb.edu.ph', password_hash: '$2b$10$jkl', role: 'teacher' },
  ],
  teachers: [
    { id: 'T001', name: 'Maria Santos', email: 'teacher@srcb.edu.ph', status: 'Full-Time', program_major_id: 1 },
    { id: 'T002', name: 'Roberto Santos', email: 'roberto@srcb.edu.ph', status: 'Part-Time', program_major_id: 1 },
  ],
  program_majors: [
    { id: 1, code: 'BSIT', name: 'Bachelor of Science in Information Technology', program_code: 'ITP', program_head_id: 2 },
  ],
  programs: [
    { code: 'ITP', name: 'Information Technology Program', focus: 'IT' },
    { code: 'CJEP', name: 'Criminal Justice Education Program', focus: 'Criminology' },
  ],
  subjects: [
    { code: 'CS101', name: 'Intro to Programming', program_code: 'ITP', instructor_id: 'T001', units: 3, lecture_hours: 2, lab_hours: 3 },
    { code: 'CS102', name: 'Data Structures', program_code: 'ITP', instructor_id: 'T002', units: 3, lecture_hours: 3, lab_hours: 0 },
    { code: 'CRI101', name: 'Intro to Criminology', program_code: 'CJEP', instructor_id: null, units: 3, lecture_hours: 3, lab_hours: 0 },
  ],
  sections: [
    { id: 1, course_code: 'BSCS', year_level: 1, section_label: 'A', adviser_id: 'T001', students: 30 },
    { id: 2, course_code: 'BSCS', year_level: 1, section_label: 'B', adviser_id: 'T002', students: 50 },
  ],
  rooms: [
    { number: 'LAB-02', capacity: 35, building: 'Science Block', type: 'Laboratory', status: 'Available' },
    { number: 'R-101', capacity: 40, building: 'Main Building', type: 'Lecture', status: 'Available' },
    { number: 'R-SMALL', capacity: 20, building: 'Annex', type: 'Lecture', status: 'Available' },
  ],
  schedules: [],
  teacher_availability: [
    { id: 1, teacher_id: 'T002', day_of_week: 'Tuesday', start_time: '08:00:00', end_time: '17:00:00' },
  ],
  exam_schedules: [],
};

function resetTableData() {
  tableData.schedules = [
    {
      id: 1,
      day: 'Monday',
      start_time: '08:00:00',
      end_time: '11:00:00',
      subject_code: 'CS101',
      section_id: 1,
      faculty_id: 'T001',
      room_number: 'LAB-02',
      color: '#2563eb',
    },
    {
      id: 2,
      day: 'Tuesday',
      start_time: '09:00:00',
      end_time: '12:00:00',
      subject_code: 'CS102',
      section_id: 1,
      faculty_id: 'T002',
      room_number: 'R-101',
      color: '#0d9488',
    },
  ];
  tableData.exam_schedules = [
    {
      id: 1,
      term: 'Midterm',
      exam_date: '2026-10-15',
      start_time: '08:00:00',
      end_time: '10:00:00',
      subject_code: 'CS101',
      section_names: '["BSCS 1-A"]',
      room_number: 'LAB-02',
      building: 'Science Block',
      proctor_id: 'T001',
      proctor_name: 'Maria Santos',
      program_code: 'ITP',
      color: '#2563eb',
    },
  ];
}

const mockQueryExecutor = async (sql, params = []) => {
  const s = String(sql).replace(/\s+/g, ' ').trim();

  if (s.includes('FROM schedules sc')) {
    let list = [...tableData.schedules];
    if (s.includes('sc.faculty_id = ?')) {
      const facId = params[0];
      list = list.filter((item) => item.faculty_id === facId);
    }
    return list.map((item) => {
      const sub = tableData.subjects.find((x) => x.code === item.subject_code);
      const teacher = tableData.teachers.find((x) => x.id === item.faculty_id);
      const room = tableData.rooms.find((x) => x.number === item.room_number);
      const sec = tableData.sections.find((x) => x.id === item.section_id);
      return {
        ...item,
        subject_name: sub?.name || item.subject_code,
        program_code: sub?.program_code || 'ITP',
        faculty_name: teacher?.name || '',
        faculty_status: teacher?.status || 'Full-Time',
        building: room?.building || 'College Building',
        room_type: room?.type || 'Lecture',
        room_capacity: room?.capacity || 40,
        section_name: sec ? `${sec.course_code} ${sec.year_level}-${sec.section_label}` : '',
        section_course_code: sec?.course_code || 'BSCS',
        section_students: sec?.students || 30,
      };
    });
  }

  if (s.includes('FROM teachers') && (s.includes('email = ?') || s.includes('LOWER(TRIM(email)) = ?'))) {
    const email = String(params[0] || '').toLowerCase();
    const found = tableData.teachers.find((t) => t.email.toLowerCase() === email);
    return found ? [found] : [];
  }

  if (s.includes('FROM teachers') && (s.includes('t.id = ?') || s.includes('id = ?'))) {
    const t = tableData.teachers.find((x) => x.id === params[0]);
    return t ? [t] : [];
  }

  if (s.includes('SELECT pm.id, pm.code, pm.name, pm.program_code') || s.includes('SELECT program_code, code FROM program_majors')) {
    const uid = params[0];
    return tableData.program_majors.filter((m) => m.program_head_id === uid);
  }

  if (s.includes('FROM exam_schedules es') || s.includes('FROM exam_schedules')) {
    let list = [...tableData.exam_schedules];
    if (s.includes('es.proctor_id = ?')) {
      const pid = params[0];
      list = list.filter((e) => e.proctor_id === pid);
    }
    if (s.includes('WHERE id != ?')) {
      list = list.filter((e) => e.id !== params[0]);
    }
    if (s.includes('WHERE id = ?')) {
      list = list.filter((e) => e.id === Number(params[0]));
    }
    return list.map((e) => ({
      ...e,
      subject_name: 'Intro to Programming',
    }));
  }

  if (s.includes('INSERT INTO schedules')) {
    const newSched = {
      id: tableData.schedules.length + 1,
      day: params[0],
      start_time: params[1],
      end_time: params[2],
      subject_code: params[3],
      section_id: params[4],
      faculty_id: params[5],
      room_number: params[6],
      color: params[7] || '#2563eb',
    };
    tableData.schedules.push(newSched);
    return [{ insertId: newSched.id }];
  }

  if (s.includes('INSERT INTO exam_schedules')) {
    const newExam = {
      id: tableData.exam_schedules.length + 1,
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
    tableData.exam_schedules.push(newExam);
    return [{ insertId: newExam.id }];
  }

  if (s.includes('UPDATE schedules SET')) {
    const id = params[params.length - 1];
    const sched = tableData.schedules.find((x) => x.id === Number(id));
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
    return tableData.schedules.filter((x) => x.id !== Number(params[0]));
  }

  if (s.includes('FROM schedules WHERE sc.id = ?') || s.includes('FROM schedules WHERE id = ?') || s.includes('WHERE sc.id = ?')) {
    const found = tableData.schedules.find((x) => x.id === Number(params[0]));
    if (!found) return [];
    const sub = tableData.subjects.find((x) => x.code === found.subject_code);
    const sec = tableData.sections.find((x) => x.id === found.section_id);
    return [{
      ...found,
      program_code: sub?.program_code || 'ITP',
      course_code: sec?.course_code || 'BSCS',
    }];
  }

  if (s.includes('SELECT code, name, program_code, lab_hours, lecture_hours FROM subjects WHERE code = ?') || s.includes('SELECT code FROM subjects WHERE code = ?')) {
    const sub = tableData.subjects.find((x) => x.code === params[0]);
    return sub ? [sub] : [];
  }

  if (s.includes('SELECT number, capacity, building, type, status FROM rooms WHERE number = ?') || s.includes('SELECT number FROM rooms WHERE number = ?')) {
    const r = tableData.rooms.find((x) => x.number === params[0]);
    return r ? [r] : [];
  }

  if (s.includes('SELECT id, course_code, year_level, section_label, students FROM sections WHERE id = ?') || s.includes('SELECT id FROM sections WHERE id = ?')) {
    const sec = tableData.sections.find((x) => x.id === Number(params[0]));
    return sec ? [sec] : [];
  }

  if (s.includes('FROM teacher_availability WHERE teacher_id = ?')) {
    return tableData.teacher_availability.filter((a) => a.teacher_id === params[0]);
  }

  if (s.includes('DELETE FROM schedules WHERE id = ?')) {
    tableData.schedules = tableData.schedules.filter((s) => s.id !== Number(params[0]));
    return [{ affectedRows: 1 }];
  }

  if (s.includes('SELECT id, course_code, year_level, section_label, students FROM sections ORDER BY id ASC')) {
    return tableData.sections;
  }

  if (s.includes('SELECT code, name, program_code, instructor_id, lecture_hours, lab_hours FROM subjects ORDER BY code ASC')) {
    return tableData.subjects;
  }

  if (s.includes('SELECT number, capacity, building, type FROM rooms WHERE status = "Available"')) {
    return tableData.rooms;
  }

  if (s.includes('FROM courses WHERE code = ? AND program_code = ?')) {
    const courseCode = params[0];
    const progCode = params[1];
    if (courseCode === 'BSCS' && progCode === 'ITP') return [{ code: 'BSCS' }];
    if (courseCode === 'BSIT' && progCode === 'ITP') return [{ code: 'BSIT' }];
    return [];
  }

  if (s.includes('FROM program_majors WHERE code = ? AND program_code = ?')) {
    const code = params[0];
    const progCode = params[1];
    if (code === 'BSIT' && progCode === 'ITP') return [{ code: 'BSIT' }];
    if (code === 'BSCS' && progCode === 'ITP') return [{ code: 'BSCS' }];
    return [];
  }

  return [];
};

beforeEach(() => {
  resetTableData();
  db.setQueryExecutor(mockQueryExecutor);
});

afterAll(() => {
  db.setQueryExecutor(null);
});

describe('SRCB Scheduling Engine Business Logic & Security Integration', () => {
  const adminUser = { sub: 1, role: 'admin', email: 'admin@srcb.edu.ph' };
  const progHeadUser = { sub: 2, role: 'program_head', email: 'programhead@srcb.edu.ph', program: 'BSIT', programCode: 'ITP' };
  const teacherUser = { sub: 3, role: 'teacher', email: 'teacher@srcb.edu.ph', teacherId: 'T001' };

  it('1. FACULTY_CONFLICT: rejects scheduling a teacher who already has an overlapping class', async () => {
    // Schedule 1: Teacher T001 is already booked on Monday 08:00-11:00 in LAB-02 for section 1
    // Attempting to schedule T001 on Monday 09:00-10:30 in R-101 for section 1 must fail with FACULTY_CONFLICT
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Monday',
          time: '09:00-10:30',
          subjectCode: 'CS102',
          facultyId: 'T001',
          room: 'R-101',
          sectionId: '1',
        },
        adminUser
      )
    ).rejects.toMatchObject({
      code: 'FACULTY_CONFLICT',
      statusCode: 409,
    });
  });

  it('2. ROOM_CONFLICT: rejects double-booking the same room on overlapping time', async () => {
    // LAB-02 is booked Monday 08:00-11:00 with T001 and section 1
    // Attempting to schedule in LAB-02 on Monday 10:00-12:00 with Full-Time T001 on another subject must fail with ROOM_CONFLICT
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Monday',
          time: '10:00-12:00',
          subjectCode: 'CS102',
          facultyId: 'T001',
          room: 'LAB-02',
          sectionId: '1',
        },
        adminUser
      )
    ).rejects.toMatchObject({
      code: 'ROOM_CONFLICT',
      statusCode: 409,
    });
  });

  it('3. SECTION_CONFLICT: rejects a section attending two classes at the same time', async () => {
    // Section 1 has CS101 on Monday 08:00-11:00
    // Attempting to schedule another class for Section 1 on Monday 08:30-10:00 must fail with SECTION_CONFLICT
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Monday',
          time: '08:30-10:00',
          subjectCode: 'CS102',
          facultyId: 'T001',
          room: 'R-101',
          sectionId: '1',
        },
        adminUser
      )
    ).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('4. Faculty scheduling succeeds flexibly without availability window restrictions', async () => {
    // Availability restrictions removed: Part-Time faculty can be scheduled at any slot
    const created = await schedulesService.createSchedule(
      {
        day: 'Tuesday',
        time: '16:00-18:00',
        subjectCode: 'CS102',
        facultyId: 'T002',
        room: 'R-101',
        sectionId: '1',
      },
      adminUser
    );
    expect(created).toBeDefined();
    expect(created.facultyId).toBe('T002');
  });

  it('5. Part-Time faculty class completely inside availability window succeeds', async () => {
    // T002 availability is Tuesday 08:00-17:00. Requesting Tuesday 13:00-15:00 is valid
    const created = await schedulesService.createSchedule(
      {
        day: 'Tuesday',
        time: '13:00-15:00',
        subjectCode: 'CS102',
        facultyId: 'T002',
        room: 'R-101',
        sectionId: '1',
      },
      adminUser
    );

    expect(created).toHaveProperty('id');
    expect(created.facultyId).toBe('T002');
  });

  it('6. Full-Time faculty can be scheduled across standard slots', async () => {
    // T001 is Full-Time
    const created = await schedulesService.createSchedule(
      {
        day: 'Wednesday',
        time: '08:00-11:00',
        subjectCode: 'CS101',
        facultyId: 'T001',
        room: 'LAB-02',
        sectionId: '1',
      },
      adminUser
    );

    expect(created).toHaveProperty('id');
    expect(created.facultyId).toBe('T001');
  });

  it('7. Schedule Update: excludes self from conflict check when updating details', async () => {
    // Schedule 1 is Monday 08:00-11:00 with CS101, LAB-02, T001, section 1
    // Updating schedule 1's color or keeping same time slot must not trigger self-conflict
    const updated = await schedulesService.updateSchedule(
      1,
      {
        day: 'Monday',
        time: '08:00-11:00',
        subjectCode: 'CS101',
        facultyId: 'T001',
        room: 'LAB-02',
        sectionId: '1',
        color: '#10b981',
      },
      adminUser
    );

    expect(updated.id).toBe('1');
    expect(updated.color).toBe('#10b981');
  });

  it('8. INVALID_TIME_RANGE: rejects start time >= end time or zero duration', async () => {
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Wednesday',
          time: '11:00-09:00', // start > end
          subjectCode: 'CS101',
          facultyId: 'T001',
          room: 'LAB-02',
          sectionId: '1',
        },
        adminUser
      )
    ).rejects.toMatchObject({
      code: 'INVALID_TIME_RANGE',
      statusCode: 400,
    });
  });

  it('9. ROOM_CAPACITY_EXCEEDED: rejects assigning section with 50 students into room with 20 capacity', async () => {
    // Section 2 has 50 students, R-SMALL has capacity 20
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Wednesday',
          time: '13:00-15:00',
          subjectCode: 'CS102',
          facultyId: 'T001',
          room: 'R-SMALL',
          sectionId: '2',
        },
        adminUser
      )
    ).rejects.toMatchObject({
      code: 'ROOM_CAPACITY_EXCEEDED',
      statusCode: 409,
    });
  });

  it('10. ROOM_TYPE_MISMATCH: rejects lab subject in a lecture-only room', async () => {
    // CS101 has lab_hours = 3, R-101 is Lecture type
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Wednesday',
          time: '13:00-16:00',
          subjectCode: 'CS101',
          facultyId: 'T001',
          room: 'R-101',
          sectionId: '1',
        },
        adminUser
      )
    ).rejects.toMatchObject({
      code: 'ROOM_TYPE_MISMATCH',
      statusCode: 409,
    });
  });

  it('11. UNAUTHORIZED_PROGRAM_ACCESS: Program Head cannot schedule subjects of other programs', async () => {
    // progHeadUser belongs to ITP (BSIT), CRI101 belongs to CJEP
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Wednesday',
          time: '08:00-11:00',
          subjectCode: 'CRI101',
          facultyId: 'T001',
          room: 'R-101',
          sectionId: '1',
        },
        progHeadUser
      )
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED_PROGRAM_ACCESS',
      statusCode: 403,
    });
  });

  it('12. UNAUTHORIZED_ROLE: Teacher is blocked from creating or deleting schedules', async () => {
    await expect(
      schedulesService.createSchedule(
        {
          day: 'Wednesday',
          time: '08:00-11:00',
          subjectCode: 'CS101',
          facultyId: 'T001',
          room: 'LAB-02',
          sectionId: '1',
        },
        teacherUser
      )
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED_ROLE',
      statusCode: 403,
    });

    await expect(
      schedulesService.deleteSchedule(1, teacherUser)
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED_ROLE',
      statusCode: 403,
    });
  });

  it('13. Automatic Timetable Generator returns detailed report and avoids conflicts', async () => {
    const report = await schedulesService.generateSchedules({ user: adminUser });

    expect(report).toHaveProperty('scheduled');
    expect(report).toHaveProperty('unscheduled');
    expect(report).toHaveProperty('conflictsAvoided');
    expect(report).toHaveProperty('summary');
    expect(typeof report.conflictsAvoided).toBe('number');
  });

  it('14. Exam Scheduling: detects proctor and room conflicts', async () => {
    // Exam 1 is on 2026-10-15 08:00-10:00 with Proctor T001 in LAB-02
    // Attempting another exam on 2026-10-15 09:00-11:00 with same room LAB-02 must be rejected
    await expect(
      examSchedulesService.createExamSchedule(
        {
          term: 'Midterm',
          examDate: '2026-10-15',
          time: '09:00-11:00',
          subjectCode: 'CS102',
          room: 'LAB-02',
          proctorId: 'T002',
          synchronizedSections: ['BSCS 1-B'],
          program: 'ITP',
        },
        adminUser
      )
    ).rejects.toMatchObject({
      code: 'ROOM_CONFLICT',
      statusCode: 409,
    });

    // Attempting another exam with same proctor T001 at overlapping time must be rejected
    await expect(
      examSchedulesService.createExamSchedule(
        {
          term: 'Midterm',
          examDate: '2026-10-15',
          time: '08:30-10:30',
          subjectCode: 'CS102',
          room: 'R-101',
          proctorId: 'T001',
          synchronizedSections: ['BSCS 1-B'],
          program: 'ITP',
        },
        adminUser
      )
    ).rejects.toMatchObject({
      code: 'PROCTOR_CONFLICT',
      statusCode: 409,
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { setQueryExecutor } = require('../utils/db');
const { schedulesService } = require('../services/schedules.service');

describe('Schedule Duration & Room Logic Validation', () => {
  let mockSubjects = [];
  let mockTeachers = [];
  let mockRooms = [];
  let mockSections = [];
  let mockSchedules = [];

  beforeEach(() => {
    mockSubjects = [
      { code: 'GE101', name: 'Understanding the Self', units: 3, lecture_hours: 1.5, lab_hours: 0, program_code: 'ALL', instructor_id: 'T001' },
      { code: 'IT101', name: 'Computer Programming 1', units: 3, lecture_hours: 2, lab_hours: 3, program_code: 'ITP', instructor_id: 'T001' },
      { code: 'CS102', name: 'Data Structures (Lec Only)', units: 3, lecture_hours: 2, lab_hours: 0, program_code: 'ITP', instructor_id: 'T002' },
      { code: 'HM301', name: 'Culinary Arts Special Lab', units: 4, lecture_hours: 1, lab_hours: 4, program_code: 'HMP', instructor_id: 'T003' },
    ];

    mockTeachers = [
      { id: 'T001', name: 'Prof. Ada Lovelace', status: 'Full-Time' },
      { id: 'T002', name: 'Dr. Alan Turing', status: 'Full-Time' },
      { id: 'T003', name: 'Chef Gordon', status: 'Full-Time' },
    ];

    mockRooms = [
      { number: 'COL-101', capacity: 40, building: 'College Building', type: 'Lecture', status: 'Available' },
      { number: 'COL-102', capacity: 40, building: 'College Building', type: 'Lecture', status: 'Available' },
      { number: 'LAB-201', capacity: 40, building: 'College Building', type: 'Laboratory', status: 'Available' },
    ];

    mockSections = [
      { id: 1, course_code: 'BSIT', year_level: 1, section_label: 'A', students: 30 },
      { id: 2, course_code: 'BSIT', year_level: 1, section_label: 'B', students: 30 },
      { id: 3, course_code: 'BSHM', year_level: 3, section_label: 'A', students: 25 },
    ];

    mockSchedules = [];

    setQueryExecutor(async (sql, params) => {
      const s = String(sql).replace(/\s+/g, ' ').trim();

      if (s.includes('FROM subjects WHERE code = ?')) {
        const row = mockSubjects.find((sub) => sub.code === params[0]);
        return row ? [row] : [];
      }

      if (s.includes('FROM teachers WHERE id = ?')) {
        const row = mockTeachers.find((t) => t.id === params[0]);
        return row ? [row] : [];
      }

      if (s.includes('FROM rooms WHERE number = ?')) {
        const row = mockRooms.find((r) => r.number === params[0]);
        return row ? [row] : [];
      }

      if (s.includes('FROM sections WHERE id = ?')) {
        const row = mockSections.find((sec) => sec.id === Number(params[0]));
        return row ? [row] : [];
      }

      if (s.includes('FROM schedules WHERE id != ?')) {
        return mockSchedules;
      }

      if (s.includes('INSERT INTO schedules')) {
        const newId = String(mockSchedules.length + 1);
        mockSchedules.push({
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
        return [{ insertId: Number(newId) }];
      }

      return [];
    });
  });

  describe('1. Minor / General Education Subject Durations (1.5 Hours / 90 Minutes)', () => {
    it('accepts valid 1.5h schedule (08:00 AM - 09:30 AM) for minor subject', async () => {
      const result = await schedulesService.createSchedule({
        day: 'Monday',
        start_time: '08:00 AM',
        end_time: '09:30 AM',
        subject_code: 'GE101',
        section_id: 1,
        faculty_id: 'T001',
        room_number: 'COL-101',
        classMode: 'Lecture',
      });

      expect(result).toBeDefined();
      expect(result.time).toBe('08:00-09:30');
    });

    it('rejects invalid duration (e.g. 2h or 1h) for minor subject with INVALID_CLASS_DURATION', async () => {
      await expect(
        schedulesService.createSchedule({
          day: 'Monday',
          start_time: '08:00 AM',
          end_time: '10:00 AM', // 2h instead of 1.5h
          subject_code: 'GE101',
          section_id: 1,
          faculty_id: 'T001',
          room_number: 'COL-101',
          classMode: 'Lecture',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_CLASS_DURATION',
      });
    });
  });

  describe('2. Major Subject Lecture Component (2 Hours / 120 Minutes)', () => {
    it('accepts valid 2h schedule (08:00 AM - 10:00 AM) for major lecture', async () => {
      const result = await schedulesService.createSchedule({
        day: 'Monday',
        start_time: '08:00 AM',
        end_time: '10:00 AM',
        subject_code: 'IT101',
        section_id: 1,
        faculty_id: 'T001',
        room_number: 'COL-101',
        classMode: 'Lecture',
      });

      expect(result).toBeDefined();
      expect(result.time).toBe('08:00-10:00');
    });

    it('rejects invalid duration (e.g. 1.5h or 3h) for major lecture with INVALID_CLASS_DURATION', async () => {
      await expect(
        schedulesService.createSchedule({
          day: 'Monday',
          start_time: '08:00 AM',
          end_time: '09:30 AM', // 1.5h instead of 2h
          subject_code: 'IT101',
          section_id: 1,
          faculty_id: 'T001',
          room_number: 'COL-101',
          classMode: 'Lecture',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_CLASS_DURATION',
      });
    });
  });

  describe('3. Major Subject Laboratory Component (3 Hours / 180 Minutes)', () => {
    it('accepts valid 3h schedule (08:00 AM - 11:00 AM) in a Laboratory room', async () => {
      const result = await schedulesService.createSchedule({
        day: 'Tuesday',
        start_time: '08:00 AM',
        end_time: '11:00 AM',
        subject_code: 'IT101',
        section_id: 1,
        faculty_id: 'T001',
        room_number: 'LAB-201',
        classMode: 'Laboratory',
      });

      expect(result).toBeDefined();
      expect(result.time).toBe('08:00-11:00');
    });

    it('rejects invalid duration (e.g. 2h) for laboratory component with INVALID_CLASS_DURATION', async () => {
      await expect(
        schedulesService.createSchedule({
          day: 'Tuesday',
          start_time: '08:00 AM',
          end_time: '10:00 AM', // 2h instead of 3h
          subject_code: 'IT101',
          section_id: 1,
          faculty_id: 'T001',
          room_number: 'LAB-201',
          classMode: 'Laboratory',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_CLASS_DURATION',
      });
    });

    it('rejects laboratory component assigned to a lecture room with ROOM_TYPE_MISMATCH', async () => {
      await expect(
        schedulesService.createSchedule({
          day: 'Tuesday',
          start_time: '08:00 AM',
          end_time: '11:00 AM', // 3h correct duration
          subject_code: 'IT101',
          section_id: 1,
          faculty_id: 'T001',
          room_number: 'COL-101', // Lecture room instead of Lab!
          classMode: 'Laboratory',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'ROOM_TYPE_MISMATCH',
      });
    });
  });

  describe('4. Dynamic Configured Subject Hours (Custom Curriculum)', () => {
    it('enforces 1h for custom lecture (HM301) and 4h for custom lab', async () => {
      // 1h lecture succeeds
      const lecResult = await schedulesService.createSchedule({
        day: 'Wednesday',
        start_time: '08:00 AM',
        end_time: '09:00 AM', // 1h
        subject_code: 'HM301',
        section_id: 3,
        faculty_id: 'T003',
        room_number: 'COL-101',
        classMode: 'Lecture',
      });
      expect(lecResult).toBeDefined();

      // 4h lab succeeds in lab room
      const labResult = await schedulesService.createSchedule({
        day: 'Friday',
        start_time: '01:00 PM',
        end_time: '05:00 PM', // 4h
        subject_code: 'HM301',
        section_id: 3,
        faculty_id: 'T003',
        room_number: 'LAB-201',
        classMode: 'Laboratory',
      });
      expect(labResult).toBeDefined();

      // 2h lecture for HM301 rejected because its configured lecture_hours is 1
      await expect(
        schedulesService.createSchedule({
          day: 'Saturday',
          start_time: '08:00 AM',
          end_time: '10:00 AM', // 2h
          subject_code: 'HM301',
          section_id: 3,
          faculty_id: 'T003',
          room_number: 'COL-101',
          classMode: 'Lecture',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_CLASS_DURATION',
      });
    });
  });

  describe('5. Existing Conflict Prevention Integrity', () => {
    it('prevents room conflicts between overlapping schedules', async () => {
      // First schedule: 08:00 - 10:00
      await schedulesService.createSchedule({
        day: 'Monday',
        start_time: '08:00 AM',
        end_time: '10:00 AM',
        subject_code: 'IT101',
        section_id: 1,
        faculty_id: 'T001',
        room_number: 'COL-101',
        classMode: 'Lecture',
      });

      // Second schedule in same room overlapping: 09:00 - 11:00
      await expect(
        schedulesService.createSchedule({
          day: 'Monday',
          start_time: '09:00 AM',
          end_time: '11:00 AM',
          subject_code: 'CS102',
          section_id: 2,
          faculty_id: 'T002',
          room_number: 'COL-101',
          classMode: 'Lecture',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'ROOM_CONFLICT',
      });
    });

    it('prevents faculty member double booking', async () => {
      await schedulesService.createSchedule({
        day: 'Wednesday',
        start_time: '08:00 AM',
        end_time: '10:00 AM',
        subject_code: 'IT101',
        section_id: 1,
        faculty_id: 'T001',
        room_number: 'COL-101',
        classMode: 'Lecture',
      });

      await expect(
        schedulesService.createSchedule({
          day: 'Wednesday',
          start_time: '08:00 AM',
          end_time: '10:00 AM',
          subject_code: 'CS102',
          section_id: 2,
          faculty_id: 'T001', // Same faculty
          room_number: 'COL-102',
          classMode: 'Lecture',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'FACULTY_CONFLICT',
      });
    });
  });
});

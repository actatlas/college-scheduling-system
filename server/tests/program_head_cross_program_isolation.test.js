import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('../utils/db');
const { programsService } = require('../services/programs.service');
const { coursesService } = require('../services/courses.service');
const { sectionsService } = require('../services/sections.service');
const { subjectsService } = require('../services/subjects.service');
const { facultyService } = require('../services/faculty.service');
const { programMajorsService } = require('../services/programMajors.service');
const { schedulesService } = require('../services/schedules.service');
const { examSchedulesService } = require('../services/examSchedules.service');
const { scheduleAdjustmentRequestsService } = require('../services/scheduleAdjustmentRequests.service');

describe('System-Wide Cross-Program Data Isolation & Role-Scope Audit', () => {
  const adminUser = { id: 1, sub: 1, role: 'admin', email: 'admin@srcb.edu.ph', name: 'Dean Admin' };
  const superAdminUser = { id: 10, sub: 10, role: 'super_admin', email: 'superadmin@srcb.edu.ph', name: 'Super Admin' };

  const itProgramHead = { id: 2, sub: 2, role: 'program_head', program: 'ITP', programCode: 'ITP', email: 'ithead@srcb.edu.ph', name: 'Dr. Alan Turing' };
  const bsaProgramHead = { id: 3, sub: 3, role: 'program_head', program: 'BAP', programCode: 'BAP', email: 'bsahead@srcb.edu.ph', name: 'Prof. Mary Cruz' };
  const bshmProgramHead = { id: 4, sub: 4, role: 'program_head', program: 'HMP', programCode: 'HMP', email: 'bshmhead@srcb.edu.ph', name: 'Chef Gordon' };
  const cjepProgramHead = { id: 5, sub: 5, role: 'program_head', program: 'CJEP', programCode: 'CJEP', email: 'cjephead@srcb.edu.ph', name: 'Officer Stone' };
  const tepProgramHead = { id: 6, sub: 6, role: 'program_head', program: 'TEP', programCode: 'TEP', email: 'tephead@srcb.edu.ph', name: 'Dr. Maria Montessori' };

  const teacherUser = { id: 7, sub: 7, role: 'teacher', teacherId: 'T001', email: 'teacher@srcb.edu.ph', name: 'Maria Santos' };

  const samplePrograms = [
    { id: 1, code: 'ITP', name: 'Information Technology Program' },
    { id: 2, code: 'BAP', name: 'Business Administration Program' },
    { id: 3, code: 'HMP', name: 'Hospitality Management Program' },
    { id: 4, code: 'CJEP', name: 'Criminal Justice Education Program' },
    { id: 5, code: 'TEP', name: 'Teacher Education Program' },
  ];

  const sampleCourses = [
    { id: 1, code: 'BSIT', name: 'Bachelor of Science in Information Technology', program_code: 'ITP' },
    { id: 2, code: 'BSA', name: 'Bachelor of Science in Accountancy', program_code: 'BAP' },
    { id: 3, code: 'BSHM', name: 'Bachelor of Science in Hospitality Management', program_code: 'HMP' },
    { id: 4, code: 'BSCRIM', name: 'Bachelor of Science in Criminology', program_code: 'CJEP' },
    { id: 5, code: 'BSED', name: 'Bachelor of Secondary Education', program_code: 'TEP' },
  ];

  const sampleSections = [
    { id: 1, course_code: 'BSIT', year_level: '1st Year', section_label: 'A', students: 35 },
    { id: 2, course_code: 'BSA', year_level: '1st Year', section_label: 'A', students: 30 },
    { id: 3, course_code: 'BSHM', year_level: '1st Year', section_label: 'A', students: 25 },
    { id: 4, course_code: 'BSCRIM', year_level: '1st Year', section_label: 'A', students: 40 },
    { id: 5, course_code: 'BSED', year_level: '1st Year', section_label: 'A', students: 30 },
  ];

  const sampleSubjects = [
    { id: 1, code: 'IT101', name: 'Programming 1', units: 3, is_major: 1, program_code: 'ITP', lecture_hours: 2, lab_hours: 3 },
    { id: 2, code: 'ACT101', name: 'Financial Accounting 1', units: 3, is_major: 1, program_code: 'BAP', lecture_hours: 3, lab_hours: 0 },
    { id: 3, code: 'HM101', name: 'Hospitality Operations', units: 3, is_major: 1, program_code: 'HMP', lecture_hours: 3, lab_hours: 0 },
    { id: 4, code: 'CRIM101', name: 'Intro to Criminology', units: 3, is_major: 1, program_code: 'CJEP', lecture_hours: 3, lab_hours: 0 },
    { id: 5, code: 'EDUC101', name: 'Child Development', units: 3, is_major: 1, program_code: 'TEP', lecture_hours: 3, lab_hours: 0 },
    { id: 6, code: 'GE101', name: 'Understanding the Self', units: 3, is_major: 0, program_code: 'ALL', lecture_hours: 3, lab_hours: 0 },
  ];

  const sampleProgramMajors = [
    { id: 1, code: 'BSIT', name: 'Information Technology Major', program_code: 'ITP', program_head_id: 2 },
    { id: 2, code: 'BSA', name: 'Accountancy Major', program_code: 'BAP', program_head_id: 3 },
    { id: 3, code: 'BSHM', name: 'Hospitality Management Major', program_code: 'HMP', program_head_id: 4 },
    { id: 4, code: 'BSCRIM', name: 'Criminology Major', program_code: 'CJEP', program_head_id: 5 },
    { id: 5, code: 'BSED', name: 'Secondary Education Major', program_code: 'TEP', program_head_id: 6 },
  ];

  const sampleTeachers = [
    { id: 'T001', name: 'Maria Santos', email: 'teacher@srcb.edu.ph', status: 'Full-Time', program_major_id: 1, program_major_name: 'Information Technology Major', program_code: 'ITP' },
    { id: 'T002', name: 'John Business', email: 'jbusiness@srcb.edu.ph', status: 'Full-Time', program_major_id: 2, program_major_name: 'Accountancy Major', program_code: 'BAP' },
    { id: 'T003', name: 'Chef Marco', email: 'cmarco@srcb.edu.ph', status: 'Full-Time', program_major_id: 3, program_major_name: 'Hospitality Management Major', program_code: 'HMP' },
    { id: 'T004', name: 'Officer Vance', email: 'vvance@srcb.edu.ph', status: 'Full-Time', program_major_id: 4, program_major_name: 'Criminology Major', program_code: 'CJEP' },
    { id: 'T005', name: 'Teacher Claire', email: 'cclaire@srcb.edu.ph', status: 'Full-Time', program_major_id: 5, program_major_name: 'Secondary Education Major', program_code: 'TEP' },
  ];

  const sampleSchedules = [
    { id: 1, day: 'Monday', start_time: '08:00:00', end_time: '11:00:00', subject_code: 'IT101', subject_name: 'Programming 1', program_code: 'ITP', faculty_id: 'T001', faculty_name: 'Maria Santos', room_number: 'LAB-101', section_id: 1, section_course_code: 'BSIT', year_level: '1st Year', section_label: 'A' },
    { id: 2, day: 'Monday', start_time: '08:00:00', end_time: '11:00:00', subject_code: 'ACT101', subject_name: 'Financial Accounting 1', program_code: 'BAP', faculty_id: 'T002', faculty_name: 'John Business', room_number: 'R102', section_id: 2, section_course_code: 'BSA', year_level: '1st Year', section_label: 'A' },
    { id: 3, day: 'Monday', start_time: '08:00:00', end_time: '11:00:00', subject_code: 'HM101', subject_name: 'Hospitality Operations', program_code: 'HMP', faculty_id: 'T003', faculty_name: 'Chef Marco', room_number: 'HM-LAB', section_id: 3, section_course_code: 'BSHM', year_level: '1st Year', section_label: 'A' },
    { id: 4, day: 'Monday', start_time: '08:00:00', end_time: '11:00:00', subject_code: 'CRIM101', subject_name: 'Intro to Criminology', program_code: 'CJEP', faculty_id: 'T004', faculty_name: 'Officer Vance', room_number: 'CRIM-101', section_id: 4, section_course_code: 'BSCRIM', year_level: '1st Year', section_label: 'A' },
    { id: 5, day: 'Monday', start_time: '08:00:00', end_time: '11:00:00', subject_code: 'EDUC101', subject_name: 'Child Development', program_code: 'TEP', faculty_id: 'T005', faculty_name: 'Teacher Claire', room_number: 'ED-101', section_id: 5, section_course_code: 'BSED', year_level: '1st Year', section_label: 'A' },
  ];

  const sampleExams = [
    { id: 1, term: 'Midterm', exam_date: '2026-10-15', start_time: '08:00:00', end_time: '10:00:00', subject_code: 'IT101', program_code: 'ITP', room_number: 'LAB-101', proctor_id: 'T001', proctor_name: 'Maria Santos' },
    { id: 2, term: 'Midterm', exam_date: '2026-10-15', start_time: '08:00:00', end_time: '10:00:00', subject_code: 'ACT101', program_code: 'BAP', room_number: 'R102', proctor_id: 'T002', proctor_name: 'John Business' },
    { id: 3, term: 'Midterm', exam_date: '2026-10-15', start_time: '08:00:00', end_time: '10:00:00', subject_code: 'HM101', program_code: 'HMP', room_number: 'HM-LAB', proctor_id: 'T003', proctor_name: 'Chef Marco' },
    { id: 4, term: 'Midterm', exam_date: '2026-10-15', start_time: '08:00:00', end_time: '10:00:00', subject_code: 'CRIM101', program_code: 'CJEP', room_number: 'CRIM-101', proctor_id: 'T004', proctor_name: 'Officer Vance' },
    { id: 5, term: 'Midterm', exam_date: '2026-10-15', start_time: '08:00:00', end_time: '10:00:00', subject_code: 'EDUC101', program_code: 'TEP', room_number: 'ED-101', proctor_id: 'T005', proctor_name: 'Teacher Claire' },
  ];

  beforeEach(() => {
    db.setQueryExecutor(async (sql, params) => {
      const s = String(sql || '').replace(/\s+/g, ' ').trim();

      if (s.includes('FROM schedules sc')) {
        if (s.includes('WHERE sc.id = ?') || s.includes('WHERE id = ?')) {
          const id = params?.[0];
          const match = sampleSchedules.find((sc) => Number(sc.id) === Number(id));
          return match ? [match] : [];
        }
        if (params && params.length > 0) {
          const progParams = params.map((p) => String(p).toUpperCase());
          const filtered = sampleSchedules.filter((sc) => {
            const pCode = String(sc.program_code || '').toUpperCase();
            const cCode = String(sc.section_course_code || '').toUpperCase();
            return progParams.includes(pCode) || progParams.includes(cCode);
          });
          return filtered;
        }
        return sampleSchedules;
      }

      if (s.includes('FROM exam_schedules es') || s.includes('FROM exam_schedules')) {
        if (s.includes('WHERE es.id = ?') || s.includes('WHERE id = ?')) {
          const id = params?.[0];
          const match = sampleExams.find((e) => Number(e.id) === Number(id));
          return match ? [match] : [];
        }
        if (params && params.length > 0) {
          const progParams = params.map((p) => String(p).toUpperCase());
          return sampleExams.filter((e) => progParams.includes(String(e.program_code || '').toUpperCase()));
        }
        return sampleExams;
      }

      if (s.includes('FROM system_settings')) {
        return [{ setting_value: JSON.stringify({ Midterm: '2026-10-15' }) }];
      }

      if (s.includes('FROM program_majors pm')) {
        return sampleProgramMajors.map((pm) => ({
          id: pm.id,
          code: pm.code,
          name: pm.name,
          program_code: pm.program_code,
          program_head_id: pm.program_head_id,
          program_name: pm.name,
          program_head_name: 'Program Head',
        }));
      }

      if (s.includes('FROM program_majors WHERE program_head_id = ?')) {
        const uid = params?.[0];
        const match = sampleProgramMajors.find((pm) => pm.program_head_id === uid);
        return match ? [{ program_code: match.program_code, code: match.code }] : [];
      }

      if (s.includes('FROM programs')) {
        return samplePrograms;
      }

      if (s.includes('FROM courses')) {
        return sampleCourses;
      }

      if (s.includes('FROM sections sec') || s.includes('FROM sections s') || s.includes('FROM sections')) {
        return sampleSections.map((sec) => ({
          id: sec.id,
          course_code: sec.course_code,
          year_level: sec.year_level,
          section_label: sec.section_label,
          students: sec.students,
        }));
      }

      if (s.includes('FROM subjects sub') || s.includes('FROM subjects s') || s.includes('FROM subjects')) {
        if (s.includes('WHERE s.is_major = 1 AND s.program_code IN') || s.includes('WHERE (s.program_code IN')) {
          const prog = params?.[0];
          return sampleSubjects.filter((sub) => sub.is_major === 1 && (sub.program_code === prog || (params || []).includes(sub.program_code)));
        }
        if (s.includes('WHERE sub.code = ?') || s.includes('WHERE code = ?') || s.includes('WHERE s.code = ?')) {
          const c = params?.[0];
          const match = sampleSubjects.find((sub) => sub.code === c);
          return match ? [match] : [];
        }
        return sampleSubjects;
      }

      if (s.includes('FROM teachers t') || s.includes('FROM teachers')) {
        return sampleTeachers;
      }

      return [];
    });
  });

  afterEach(() => {
    db.setQueryExecutor(null);
  });

  // =========================================================================
  // 1. PROGRAMS SERVICE ISOLATION
  // =========================================================================
  describe('Programs Service Isolation', () => {
    it('Admin sees all academic programs', async () => {
      const programs = await programsService.listPrograms(adminUser);
      expect(programs.length).toBe(5);
      expect(programs.map((p) => p.code)).toEqual(expect.arrayContaining(['ITP', 'BAP', 'HMP', 'CJEP', 'TEP']));
    });

    it('IT Program Head sees only ITP and not other programs', async () => {
      const programs = await programsService.listPrograms(itProgramHead);
      expect(programs.length).toBe(1);
      expect(programs[0].code).toBe('ITP');
      expect(programs.some((p) => p.code === 'BAP' || p.code === 'CJEP' || p.code === 'HMP' || p.code === 'TEP')).toBe(false);
    });

    it('BSA Program Head sees only BAP/BSA and not other programs', async () => {
      const programs = await programsService.listPrograms(bsaProgramHead);
      expect(programs.length).toBe(1);
      expect(programs[0].code).toBe('BAP');
      expect(programs.some((p) => p.code === 'ITP' || p.code === 'CJEP' || p.code === 'HMP' || p.code === 'TEP')).toBe(false);
    });

    it('BSHM Program Head sees only HMP and not other programs', async () => {
      const programs = await programsService.listPrograms(bshmProgramHead);
      expect(programs.length).toBe(1);
      expect(programs[0].code).toBe('HMP');
      expect(programs.some((p) => p.code === 'ITP' || p.code === 'BAP' || p.code === 'CJEP' || p.code === 'TEP')).toBe(false);
    });

    it('CJEP Program Head sees only CJEP and not other programs', async () => {
      const programs = await programsService.listPrograms(cjepProgramHead);
      expect(programs.length).toBe(1);
      expect(programs[0].code).toBe('CJEP');
      expect(programs.some((p) => p.code === 'ITP' || p.code === 'BAP' || p.code === 'HMP' || p.code === 'TEP')).toBe(false);
    });

    it('TEP Program Head sees only TEP and not other programs', async () => {
      const programs = await programsService.listPrograms(tepProgramHead);
      expect(programs.length).toBe(1);
      expect(programs[0].code).toBe('TEP');
      expect(programs.some((p) => p.code === 'ITP' || p.code === 'BAP' || p.code === 'HMP' || p.code === 'CJEP')).toBe(false);
    });
  });

  // =========================================================================
  // 2. COURSES SERVICE ISOLATION
  // =========================================================================
  describe('Courses Service Isolation', () => {
    it('Admin sees all courses across all programs', async () => {
      const courses = await coursesService.listCourses(adminUser);
      expect(courses.length).toBe(5);
    });

    it('IT Program Head sees only IT courses', async () => {
      const courses = await coursesService.listCourses(itProgramHead);
      expect(courses.every((c) => c.programCode === 'ITP' || c.code === 'BSIT')).toBe(true);
      expect(courses.some((c) => c.code === 'BSA' || c.code === 'BSHM' || c.code === 'BSCRIM' || c.code === 'BSED')).toBe(false);
    });

    it('BSA Program Head sees only BSA courses', async () => {
      const courses = await coursesService.listCourses(bsaProgramHead);
      expect(courses.every((c) => c.programCode === 'BAP' || c.code === 'BSA')).toBe(true);
      expect(courses.some((c) => c.code === 'BSIT' || c.code === 'BSHM' || c.code === 'BSCRIM' || c.code === 'BSED')).toBe(false);
    });
  });

  // =========================================================================
  // 3. SECTIONS SERVICE ISOLATION
  // =========================================================================
  describe('Sections Service Isolation', () => {
    it('Admin sees all sections across all programs', async () => {
      const sections = await sectionsService.listSections(adminUser);
      expect(sections.length).toBe(5);
    });

    it('IT Program Head sees only IT sections', async () => {
      const sections = await sectionsService.listSections(itProgramHead);
      expect(sections.every((s) => s.courseCode === 'BSIT' || s.programCode === 'ITP')).toBe(true);
      expect(sections.some((s) => s.courseCode === 'BSA' || s.courseCode === 'BSCRIM')).toBe(false);
    });

    it('CJEP Program Head sees only CJEP sections', async () => {
      const sections = await sectionsService.listSections(cjepProgramHead);
      expect(sections.every((s) => s.courseCode === 'BSCRIM' || s.programCode === 'CJEP')).toBe(true);
      expect(sections.some((s) => s.courseCode === 'BSIT' || s.courseCode === 'BSA')).toBe(false);
    });
  });

  // =========================================================================
  // 4. SUBJECTS SERVICE ISOLATION
  // =========================================================================
  describe('Subjects Service Isolation', () => {
    it('Admin sees all major and minor subjects', async () => {
      const subjects = await subjectsService.listSubjects(adminUser);
      expect(subjects.length).toBe(6);
    });

    it('IT Program Head sees only IT major subjects', async () => {
      const subjects = await subjectsService.listSubjects(itProgramHead);
      expect(subjects.every((s) => s.programCode === 'ITP' || s.code.startsWith('IT'))).toBe(true);
      expect(subjects.some((s) => s.code === 'ACT101' || s.code === 'HM101' || s.code === 'CRIM101' || s.code === 'EDUC101' || s.code === 'GE101')).toBe(false);
    });

    it('BSA Program Head sees only BSA major subjects', async () => {
      const subjects = await subjectsService.listSubjects(bsaProgramHead);
      expect(subjects.every((s) => s.programCode === 'BAP' || s.code.startsWith('ACT'))).toBe(true);
      expect(subjects.some((s) => s.code === 'IT101' || s.code === 'HM101' || s.code === 'CRIM101' || s.code === 'EDUC101')).toBe(false);
    });
  });

  // =========================================================================
  // 5. FACULTY SERVICE ISOLATION
  // =========================================================================
  describe('Faculty Service Isolation', () => {
    it('Admin sees full faculty directory', async () => {
      const faculty = await facultyService.listFaculty(adminUser);
      expect(faculty.length).toBe(5);
    });

    it('IT Program Head sees only IT faculty', async () => {
      const faculty = await facultyService.listFaculty(itProgramHead);
      expect(faculty.every((f) => f.department.includes('Information Technology') || f.program_code === 'ITP')).toBe(true);
      expect(faculty.some((f) => f.name === 'Chef Marco' || f.name === 'Officer Vance' || f.name === 'Teacher Claire')).toBe(false);
    });

    it('HMP Program Head sees only HMP faculty', async () => {
      const faculty = await facultyService.listFaculty(bshmProgramHead);
      expect(faculty.every((f) => f.department.includes('Hospitality') || f.program_code === 'HMP')).toBe(true);
      expect(faculty.some((f) => f.name === 'Maria Santos' || f.name === 'Officer Vance')).toBe(false);
    });
  });

  // =========================================================================
  // 6. SCHEDULES SERVICE ISOLATION & ATTACK ATTEMPTS
  // =========================================================================
  describe('Schedules Service Isolation & Attack Attempts', () => {
    it('IT Program Head listSchedules returns only IT schedules', async () => {
      const schedules = await schedulesService.listSchedules({ user: itProgramHead });
      expect(schedules.length).toBe(1);
      expect(schedules[0].subjectCode).toBe('IT101');
      expect(schedules.some((s) => s.subjectCode === 'ACT101' || s.subjectCode === 'HM101' || s.subjectCode === 'CRIM101' || s.subjectCode === 'EDUC101')).toBe(false);
    });

    it('IT Program Head cannot access BSA schedules by query parameter tampering (?program=BSA)', async () => {
      // Backend must ignore or reject client tampering
      const schedules = await schedulesService.listSchedules({ user: itProgramHead, program: 'BSA' });
      expect(schedules.some((s) => s.subjectCode === 'ACT101' || s.course === 'BSA')).toBe(false);
    });

    it('IT Program Head cannot delete another program schedule', async () => {
      await expect(schedulesService.deleteSchedule(2, itProgramHead)).rejects.toThrow(/Unauthorized/i);
    });

    it('IT Program Head cannot update another program schedule', async () => {
      await expect(schedulesService.updateSchedule(2, { day: 'Tuesday' }, itProgramHead)).rejects.toThrow(/Unauthorized/i);
    });
  });

  // =========================================================================
  // 7. EXAM SCHEDULES SERVICE ISOLATION & RESTRICTIONS
  // =========================================================================
  describe('Exam Schedules Service Isolation & Restrictions', () => {
    it('IT Program Head listExamSchedules returns only IT exams', async () => {
      const exams = await examSchedulesService.listExamSchedules({ user: itProgramHead });
      expect(exams.every((e) => e.program === 'ITP' || e.subjectCode === 'IT101')).toBe(true);
      expect(exams.some((e) => e.subjectCode === 'ACT101' || e.subjectCode === 'CRIM101')).toBe(false);
    });

    it('IT Program Head cannot schedule exam for another program major subject (ACT101)', async () => {
      await expect(
        examSchedulesService.createExamSchedule(
          {
            term: 'Midterm',
            examDate: '2026-10-15',
            time: '08:00-10:00',
            subjectCode: 'ACT101',
            program: 'BAP',
            room: 'R102',
          },
          itProgramHead
        )
      ).rejects.toThrow(/Unauthorized/i);
    });

    it('IT Program Head cannot delete another program exam schedule', async () => {
      await expect(examSchedulesService.deleteExamSchedule(2, itProgramHead)).rejects.toThrow(/Unauthorized/i);
    });
  });

  // =========================================================================
  // 8. SCHEDULE ADJUSTMENT REQUESTS ISOLATION
  // =========================================================================
  describe('Schedule Adjustment Requests Isolation', () => {
    it('Teacher cannot submit schedule adjustment requests', async () => {
      await expect(
        scheduleAdjustmentRequestsService.createAdjustmentRequest(
          { scheduleId: 1, reason: 'Conflict' },
          teacherUser
        )
      ).rejects.toThrow(/Teachers are not authorized/i);
    });

    it('IT Program Head cannot view other program adjustment requests', async () => {
      const reqs = await scheduleAdjustmentRequestsService.listAdjustmentRequests({ user: itProgramHead });
      expect(reqs.every((r) => r.requesterProgram === 'ITP' || r.requestedByUserId === 2)).toBe(true);
    });
  });
});

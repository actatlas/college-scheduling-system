import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('../utils/db');
const { subjectsService, isGeneralEducationSubject, isProgramMatch } = require('../services/subjects.service.js');
const { examSchedulesService } = require('../services/examSchedules.service.js');

describe('Exam Subject Palette Backend Role-Based Enforcement', () => {
  const adminUser = { id: 1, sub: 1, role: 'admin', email: 'admin@srcb.edu.ph' };
  const itpHeadUser = { id: 2, sub: 2, role: 'program_head', program: 'BSIT', programCode: 'ITP', email: 'ithead@srcb.edu.ph' };
  const bsaHeadUser = { id: 3, sub: 3, role: 'program_head', program: 'BSA', programCode: 'BAP', email: 'bsahead@srcb.edu.ph' };
  const bshmHeadUser = { id: 4, sub: 4, role: 'program_head', program: 'BSHM', programCode: 'HMP', email: 'bshmhead@srcb.edu.ph' };
  const cjepHeadUser = { id: 5, sub: 5, role: 'program_head', program: 'BSCRIM', programCode: 'CJEP', email: 'cjephead@srcb.edu.ph' };
  const tepHeadUser = { id: 6, sub: 6, role: 'program_head', program: 'BSED', programCode: 'TEP', email: 'tephead@srcb.edu.ph' };
  const teacherUser = { id: 7, sub: 7, role: 'teacher', teacherId: 'T001', email: 'teacher@srcb.edu.ph' };

  const sampleSubjects = [
    { code: 'IT101', name: 'Programming 1', units: 3, lecture_hours: 2, lab_hours: 3, semester_id: 1, program_code: 'ITP', instructor_id: 'T001' },
    { code: 'CS102', name: 'Data Structures', units: 3, lecture_hours: 3, lab_hours: 0, semester_id: 1, program_code: 'ITP', instructor_id: 'T001' },
    { code: 'ACT101', name: 'Financial Accounting 1', units: 3, lecture_hours: 3, lab_hours: 0, semester_id: 1, program_code: 'BAP', instructor_id: 'T001' },
    { code: 'HM101', name: 'Hospitality Overview', units: 3, lecture_hours: 3, lab_hours: 0, semester_id: 1, program_code: 'HMP', instructor_id: 'T001' },
    { code: 'CRIM101', name: 'Intro to Criminology', units: 3, lecture_hours: 3, lab_hours: 0, semester_id: 1, program_code: 'CJEP', instructor_id: 'T001' },
    { code: 'EDUC101', name: 'Child Development', units: 3, lecture_hours: 3, lab_hours: 0, semester_id: 1, program_code: 'TEP', instructor_id: 'T001' },
    { code: 'GE101', name: 'Understanding the Self', units: 3, lecture_hours: 3, lab_hours: 0, semester_id: 1, program_code: 'ALL', instructor_id: 'T001' },
    { code: 'PE1', name: 'Physical Fitness', units: 2, lecture_hours: 2, lab_hours: 0, semester_id: 1, program_code: 'ALL', instructor_id: 'T001' },
    { code: 'NSTP1', name: 'National Service 1', units: 3, lecture_hours: 3, lab_hours: 0, semester_id: 1, program_code: 'ALL', instructor_id: 'T001' },
  ];

  beforeEach(() => {
    db.setQueryExecutor(async (sql, params) => {
      const s = String(sql || '').replace(/\s+/g, ' ').trim();
      if (s.includes('FROM system_settings')) {
        return [{ setting_value: JSON.stringify({ Midterm: '2026-10-15' }) }];
      }
      if (s.includes('FROM program_majors WHERE program_head_id = ?')) {
        const uid = params?.[0];
        if (uid === 2) return [{ program_code: 'ITP', code: 'BSIT' }];
        if (uid === 3) return [{ program_code: 'BAP', code: 'BSA' }];
        if (uid === 4) return [{ program_code: 'HMP', code: 'BSHM' }];
        if (uid === 5) return [{ program_code: 'CJEP', code: 'BSCRIM' }];
        if (uid === 6) return [{ program_code: 'TEP', code: 'BSED' }];
        return [];
      }
      if (s.includes('FROM subjects WHERE code = ?')) {
        const c = params?.[0];
        const match = sampleSubjects.find((sub) => sub.code === c);
        return match ? [match] : [];
      }
      if (s.includes('FROM subjects s')) {
        return sampleSubjects;
      }
      if (s.includes('FROM exam_schedules WHERE id !=')) {
        return [];
      }
      return [];
    });
  });

  afterEach(() => {
    db.setQueryExecutor(null);
  });

  it('1. Admin receives full subject catalog when querying forExam', async () => {
    const rows = await subjectsService.listSubjects(null, adminUser, { forExam: true });
    expect(rows.length).toBe(9);
    expect(rows.some((s) => s.code === 'IT101')).toBe(true);
    expect(rows.some((s) => s.code === 'ACT101')).toBe(true);
    expect(rows.some((s) => s.code === 'GE101')).toBe(true);
  });

  it('2. ITP Program Head receives ONLY ITP major subjects (no other programs, no GenEd/Minor)', async () => {
    const rows = await subjectsService.listSubjects(null, itpHeadUser, { forExam: true });
    expect(rows.length).toBe(2);
    expect(rows.map((r) => r.code).sort()).toEqual(['CS102', 'IT101']);
  });

  it('3. BSA Program Head receives ONLY BSA/BAP major subjects', async () => {
    const rows = await subjectsService.listSubjects(null, bsaHeadUser, { forExam: true });
    expect(rows.length).toBe(1);
    expect(rows[0].code).toBe('ACT101');
  });

  it('4. BSHM Program Head receives ONLY BSHM/HMP major subjects', async () => {
    const rows = await subjectsService.listSubjects(null, bshmHeadUser, { forExam: true });
    expect(rows.length).toBe(1);
    expect(rows[0].code).toBe('HM101');
  });

  it('5. CJEP Program Head receives ONLY CJEP/BSCRIM major subjects', async () => {
    const rows = await subjectsService.listSubjects(null, cjepHeadUser, { forExam: true });
    expect(rows.length).toBe(1);
    expect(rows[0].code).toBe('CRIM101');
  });

  it('6. TEP Program Head receives ONLY TEP/BSED major subjects', async () => {
    const rows = await subjectsService.listSubjects(null, tepHeadUser, { forExam: true });
    expect(rows.length).toBe(1);
    expect(rows[0].code).toBe('EDUC101');
  });

  it('7. Teacher receives an EMPTY array for exam subjects', async () => {
    const rows = await subjectsService.listSubjects(null, teacherUser, { forExam: true });
    expect(rows).toEqual([]);
  });

  it('8. Program Head is forbidden from scheduling a General Education subject', async () => {
    await expect(
      examSchedulesService.validateExamPayload({
        term: 'Midterm',
        examDate: '2026-10-15',
        startTime: '08:00',
        endTime: '10:00',
        subjectCode: 'GE101',
        program: 'BSIT',
        user: itpHeadUser,
      })
    ).rejects.toThrow(/General Education and Minor subjects are managed by Administrators/i);
  });

  it('9. Program Head is forbidden from scheduling a major subject from another program', async () => {
    await expect(
      examSchedulesService.validateExamPayload({
        term: 'Midterm',
        examDate: '2026-10-15',
        startTime: '08:00',
        endTime: '10:00',
        subjectCode: 'ACT101',
        program: 'BSIT',
        user: itpHeadUser,
      })
    ).rejects.toThrow(/belongs to another academic program/i);
  });

  it('10. Program Head can successfully schedule a major subject belonging to their program', async () => {
    await expect(
      examSchedulesService.validateExamPayload({
        term: 'Midterm',
        examDate: '2026-10-15',
        startTime: '08:00',
        endTime: '10:00',
        subjectCode: 'IT101',
        program: 'BSIT',
        user: itpHeadUser,
      })
    ).resolves.not.toThrow();
  });

  it('11. Teacher is forbidden from creating or updating exam schedules', async () => {
    await expect(
      examSchedulesService.createExamSchedule(
        {
          term: 'Midterm',
          examDate: '2026-10-15',
          time: '08:00-10:00',
          subjectCode: 'IT101',
        },
        teacherUser
      )
    ).rejects.toThrow(/Teachers have read-only access and cannot create exam schedules/i);

    await expect(
      examSchedulesService.updateExamSchedule(
        1,
        {
          term: 'Midterm',
        },
        teacherUser
      )
    ).rejects.toThrow(/Teachers have read-only access and cannot update exam schedules/i);
  });
});

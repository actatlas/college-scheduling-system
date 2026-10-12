import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  getFacultyScheduleDetails,
  listFacultyScheduleGroups,
  generateFacultySchedulePdf,
  dispatchScheduleToFaculty,
  publishAndDispatchAllFacultySchedules,
  resendFacultySchedule,
} = require('../services/facultyDispatch.service');
const { buildFacultySchedulePdf } = require('../utils/pdfGenerator');
const { listSystemLogs } = require('../services/systemLogs.service');
const db = require('../utils/db');

describe('SCSMS Faculty Schedule Document & Email Dispatch Suite', () => {
  const adminUser = { id: 1, sub: 1, name: 'Dean of Student Affairs', role: 'admin' };
  const itpHeadUser = { id: 2, sub: 2, name: 'IT Program Head', role: 'program_head', program: 'ITP', programCode: 'ITP' };
  const tepHeadUser = { id: 3, sub: 3, name: 'TEP Program Head', role: 'program_head', program: 'TEP', programCode: 'TEP' };

  let recordedLogs = [];

  beforeEach(() => {
    vi.restoreAllMocks();
    recordedLogs = [];
    db.setQueryExecutor(null);
  });

  function setupQueryExecutor(teachers = [], schedules = []) {
    db.setQueryExecutor(async (sql, params) => {
      const s = String(sql);
      if (s.includes('INSERT INTO system_logs')) {
        recordedLogs.push({
          target_id: params[7],
          action: params[5],
          module: params[4],
          status: params[8] || 'Success',
          created_at: new Date().toISOString(),
        });
        return [{ insertId: 1 }];
      }
      if (s.includes('FROM system_logs')) {
        return recordedLogs.map((l) => ({
          ...l,
          targetId: l.target_id,
        }));
      }
      if (s.includes('FROM teachers')) {
        if (params && params[0]) {
          const match = teachers.find(
            (t) => t.id === params[0] || t.email === params[0] || t.name === params[0]
          );
          return match ? [match] : [];
        }
        return teachers;
      }
      if (s.includes('FROM schedules')) {
        return schedules;
      }
      return [];
    });
  }

  it('1. Compiles and groups faculty schedule details accurately with totals', async () => {
    const mockTeacher = [
      {
        id: 'T-ED-001',
        name: 'Mr. Oclarit',
        employee_number: 'EMP-TEP-101',
        email: 'oclarit@srcb.edu.ph',
        status: 'Full-Time',
        faculty_type: 'Full-Time',
        department: 'Teacher Education Program',
        department_code: 'TEP',
        program_code: 'TEP',
      },
    ];

    const mockSchedules = [
      {
        id: 101,
        subject_code: 'LIT 1',
        subject_name: 'Children and Adolescent Literature',
        units: 3,
        lecture_hours: 3,
        lab_hours: 0,
        section_name: 'BSED 2-A',
        program_code: 'TEP',
        year_level: '2nd Year',
        day: 'Monday',
        start_time: '09:00:00',
        end_time: '10:30:00',
        room_number: 'Room 303',
        class_mode: 'Face-to-Face',
        status: 'PUBLISHED',
      },
      {
        id: 102,
        subject_code: 'EDUC 9',
        subject_name: 'The Teacher and the Community',
        units: 3,
        lecture_hours: 3,
        lab_hours: 0,
        section_name: 'BSED 3-A',
        program_code: 'TEP',
        year_level: '3rd Year',
        day: 'Wednesday',
        start_time: '13:00:00',
        end_time: '14:30:00',
        room_number: 'Room 304',
        class_mode: 'Face-to-Face',
        status: 'PUBLISHED',
      },
    ];

    setupQueryExecutor(mockTeacher, mockSchedules);

    const details = await getFacultyScheduleDetails('T-ED-001', { user: adminUser });

    expect(details.faculty.name).toBe('Mr. Oclarit');
    expect(details.faculty.schoolEmail).toBe('oclarit@srcb.edu.ph');
    expect(details.faculty.facultyType).toBe('Full-Time');
    expect(details.schedules).toHaveLength(2);
    expect(details.summary.totalClasses).toBe(2);
    expect(details.summary.totalUnits).toBe(6);
    expect(details.summary.totalWeeklyHours).toBe(3.0);
    expect(details.summary.dispatchStatus).toBe('READY');
  });

  it('2. Enforces Program Head strict data isolation on faculty schedules', async () => {
    const mockTeacherITP = [
      {
        id: 'T-IT-001',
        name: 'Prof. Ada Lovelace',
        email: 'adalovelace@srcb.edu.ph',
        status: 'Full-Time',
        faculty_type: 'Full-Time',
        department: 'Information Technology Program',
        department_code: 'ITP',
        program_code: 'ITP',
      },
    ];

    setupQueryExecutor(mockTeacherITP, []);

    // ITP Program Head accessing ITP faculty -> Allowed
    const itpRes = await getFacultyScheduleDetails('T-IT-001', { user: itpHeadUser });
    expect(itpRes.faculty.name).toBe('Prof. Ada Lovelace');

    // TEP Program Head accessing ITP faculty -> Forbidden (403)
    await expect(
      getFacultyScheduleDetails('T-IT-001', { user: tepHeadUser })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'UNAUTHORIZED_PROGRAM_ACCESS',
    });
  });

  it('3. Generates a valid PDF 1.4 binary buffer with official institutional layout', async () => {
    const faculty = {
      id: 'T-ED-001',
      name: 'Mr. Oclarit',
      employeeNumber: 'EMP-TEP-101',
      schoolEmail: 'oclarit@srcb.edu.ph',
      status: 'Full-Time',
      facultyType: 'Full-Time',
      department: 'Teacher Education Program',
      departmentCode: 'TEP',
      programCode: 'TEP',
    };

    const schedules = [
      {
        subjectCode: 'LIT 1',
        subjectName: 'Children and Adolescent Literature',
        units: 3,
        section: 'BSED 2-A',
        day: 'Monday',
        time: '09:00 - 10:30',
        room: 'Room 303',
        mode: 'Face-to-Face',
        courseYear: 'TEP - 2nd Year',
      },
      {
        subjectCode: 'EDUC 9',
        subjectName: 'The Teacher and the Community',
        units: 3,
        section: 'BSED 3-A',
        day: 'Wednesday',
        time: '13:00 - 14:30',
        room: 'Room 304',
        mode: 'Face-to-Face',
        courseYear: 'TEP - 3rd Year',
      },
    ];

    const { buffer, filename } = await buildFacultySchedulePdf({
      faculty,
      schedules,
      academicYear: '2026-2027',
      semester: '1st Semester',
      academicTerm: 'AY 2026-2027 · 1st Semester',
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(500);

    // Verify PDF binary structure (PDF 1.4 header and trailer)
    const pdfStr = buffer.toString('binary');
    expect(pdfStr.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfStr).toContain('%%EOF');

    // Filename follows convention: Faculty_Schedule_Mr_Oclarit_2026-2027_1st_Semester.pdf
    expect(filename).toBe('Faculty_Schedule_Mr_Oclarit_2026-2027_1st_Semester.pdf');
  });

  it('4. Privacy verification: Faculty A PDF contains ONLY Faculty A data and never leaks Faculty B', async () => {
    const facultyA = {
      id: 'T-ED-001',
      name: 'Mr. Oclarit',
      schoolEmail: 'oclarit@srcb.edu.ph',
      status: 'Full-Time',
      facultyType: 'Full-Time',
      department: 'Teacher Education Program',
      departmentCode: 'TEP',
      programCode: 'TEP',
    };
    const schedulesA = [
      {
        subjectCode: 'LIT 1',
        subjectName: 'Children and Adolescent Literature',
        units: 3,
        section: 'BSED 2-A',
        day: 'Monday',
        time: '09:00 - 10:30',
        room: 'Room 303',
        mode: 'Face-to-Face',
        courseYear: 'TEP - 2nd Year',
      },
    ];

    const facultyB = {
      id: 'T-IT-001',
      name: 'Prof. Ada Lovelace',
      schoolEmail: 'ada@srcb.edu.ph',
      status: 'Full-Time',
      facultyType: 'Full-Time',
      department: 'Information Technology Program',
      departmentCode: 'ITP',
      programCode: 'ITP',
    };
    const schedulesB = [
      {
        subjectCode: 'IT 101',
        subjectName: 'Introduction to Computing',
        units: 3,
        section: 'BSIT 1-A',
        day: 'Tuesday',
        time: '10:00 - 11:30',
        room: 'IT Lab 1',
        mode: 'Face-to-Face',
        courseYear: 'ITP - 1st Year',
      },
    ];

    const facultyAPdf = await buildFacultySchedulePdf({
      faculty: facultyA,
      schedules: schedulesA,
      academicYear: '2026-2027',
      semester: '1st Semester',
      academicTerm: 'AY 2026-2027 · 1st Semester',
    });

    const facultyBPdf = await buildFacultySchedulePdf({
      faculty: facultyB,
      schedules: schedulesB,
      academicYear: '2026-2027',
      semester: '1st Semester',
      academicTerm: 'AY 2026-2027 · 1st Semester',
    });

    const strA = facultyAPdf.buffer.toString('binary');
    const strB = facultyBPdf.buffer.toString('binary');

    expect(strA).toContain('MR. OCLARIT');
    expect(strA).toContain('LIT 1');
    expect(strA).not.toContain('PROF. ADA LOVELACE');
    expect(strA).not.toContain('IT 101');

    expect(strB).toContain('PROF. ADA LOVELACE');
    expect(strB).toContain('IT 101');
    expect(strB).not.toContain('MR. OCLARIT');
    expect(strB).not.toContain('LIT 1');
  });

  it('5. Validates official school email requirement and blocks dispatch when missing', async () => {
    const mockTeacherNoEmail = [
      {
        id: 'T-HM-001',
        name: 'Chef Gordon Ramsay',
        employee_number: 'EMP-HM-101',
        email: '', // Missing email
        status: 'Part-Time',
        faculty_type: 'Part-Time',
        department: 'Hospitality Management Program',
        department_code: 'HMP',
        program_code: 'HMP',
      },
    ];

    setupQueryExecutor(mockTeacherNoEmail, []);

    await expect(
      dispatchScheduleToFaculty({
        teacherId: 'T-HM-001',
        req: { user: adminUser },
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'MISSING_FACULTY_EMAIL',
    });
  });

  it('6. Handles single faculty dispatch, records audit log and tracks delivery status', async () => {
    const mockTeacher = [
      {
        id: 'T-BA-001',
        name: 'Prof. Warren Buffett',
        employee_number: 'EMP-BA-101',
        email: 'warrenbuffett@srcb.edu.ph',
        status: 'Part-Time',
        faculty_type: 'Part-Time',
        department: 'Business Administration Program',
        department_code: 'BAP',
        program_code: 'BAP',
      },
    ];

    setupQueryExecutor(mockTeacher, []);

    const payload = await dispatchScheduleToFaculty({
      teacherId: 'T-BA-001',
      req: { user: adminUser },
    });

    expect(payload.facultyName).toBe('Prof. Warren Buffett');
    expect(payload.to).toBe('warrenbuffett@srcb.edu.ph');
    expect(payload.pdfFilename).toBe('Faculty_Schedule_Prof_Warren_Buffett_2026-2027_1st_Semester.pdf');

    // Verify audit log
    const logsRes = await listSystemLogs({ module: 'Faculty Schedule Dispatch', limit: 20 });
    const log = logsRes.data.find((l) => l.targetId === 'T-BA-001' || l.target_id === 'T-BA-001');
    expect(log).toBeDefined();
    expect(log.action).toContain('Dispatched Schedule to Faculty via Gmail');
  });

  it('7. Supports resending faculty schedules with resend audit trail', async () => {
    const mockTeacher = [
      {
        id: 'T-ED-001',
        name: 'Mr. Oclarit',
        email: 'oclarit@srcb.edu.ph',
        status: 'Full-Time',
        faculty_type: 'Full-Time',
        department: 'Teacher Education Program',
        department_code: 'TEP',
        program_code: 'TEP',
      },
    ];

    setupQueryExecutor(mockTeacher, []);

    const resendRes = await resendFacultySchedule({
      teacherId: 'T-ED-001',
      user: adminUser,
      req: { user: adminUser },
      customNotes: 'Resending updated schedule copy per faculty request.',
    });

    expect(resendRes.facultyName).toBe('Mr. Oclarit');
    expect(resendRes.customNotes).toBe('Resending updated schedule copy per faculty request.');

    const logsRes = await listSystemLogs({ module: 'Faculty Schedule Dispatch', limit: 20 });
    const resendLog = logsRes.data.find((l) => l.action.includes('Resent Faculty Schedule'));
    expect(resendLog).toBeDefined();
  });

  it('8. Bulk publish and dispatch handles partial failures gracefully without rolling back successful ones', async () => {
    const mockTeachers = [
      { id: 'T-1', name: 'Faculty Valid Email', email: 'valid@srcb.edu.ph', status: 'Full-Time', faculty_type: 'Full-Time', department: 'TEP', program_code: 'TEP' },
      { id: 'T-2', name: 'Faculty Missing Email', email: '', status: 'Part-Time', faculty_type: 'Part-Time', department: 'ITP', program_code: 'ITP' },
    ];

    setupQueryExecutor(mockTeachers, []);

    const bulkResult = await publishAndDispatchAllFacultySchedules({
      user: adminUser,
      req: { user: adminUser },
    });

    expect(bulkResult.totalFaculty).toBe(2);
    expect(bulkResult.missingEmailCount).toBe(1);
    expect(bulkResult.results).toHaveLength(2);
    const missingItem = bulkResult.results.find((r) => r.facultyId === 'T-2');
    expect(missingItem.status).toBe('MISSING_EMAIL');
  });
});

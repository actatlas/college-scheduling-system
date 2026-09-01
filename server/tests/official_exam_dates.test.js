import { describe, it, expect, beforeEach, vi } from 'vitest';
import { examSchedulesService } from '../services/examSchedules.service.js';

describe('Official Examination Date Setting & Permissions', () => {
  const adminUser = { id: 1, role: 'admin', program: 'ALL' };
  const programHeadUser = { id: 2, role: 'program_head', program: 'BSIT', sub: 'PH001' };
  const teacherUser = { id: 3, role: 'teacher', program: 'BSIT' };

  it('allows Admin to get and update official examination period dates', async () => {
    const settings = await examSchedulesService.getExamPeriodSettings();
    expect(settings).toHaveProperty('Prelim');
    expect(settings).toHaveProperty('Midterm');
    expect(settings).toHaveProperty('Semi-Final');
    expect(settings).toHaveProperty('Final');

    const updated = await examSchedulesService.updateExamPeriodSettings(
      {
        Prelim: '2026-08-19',
        Midterm: '2026-10-15',
        'Semi-Final': '2026-12-10',
        Final: '2027-03-05',
      },
      adminUser
    );

    expect(updated.Prelim).toBe('2026-08-19');
    expect(updated.Midterm).toBe('2026-10-15');
    expect(updated['Semi-Final']).toBe('2026-12-10');
    expect(updated.Final).toBe('2027-03-05');
  });

  it('strictly forbids Program Head from updating official examination dates', async () => {
    await expect(
      examSchedulesService.updateExamPeriodSettings(
        {
          Prelim: '2026-08-25',
        },
        programHeadUser
      )
    ).rejects.toThrow(/Forbidden. Only Administrators can configure official examination dates/i);
  });

  it('strictly forbids Teachers from updating official examination dates', async () => {
    await expect(
      examSchedulesService.updateExamPeriodSettings(
        {
          Prelim: '2026-08-25',
        },
        teacherUser
      )
    ).rejects.toThrow(/Forbidden. Only Administrators can configure official examination dates/i);
  });

  it('prevents Program Head from scheduling on a non-official date', async () => {
    // Official Midterm date is '2026-10-15'
    await expect(
      examSchedulesService.validateExamPayload({
        term: 'Midterm',
        examDate: '2026-10-16', // Invalid date
        startTime: '08:00',
        endTime: '10:00',
        subjectCode: 'IT101',
        program: 'BSIT',
        user: programHeadUser,
      })
    ).rejects.toThrow(/Midterm examinations are officially scheduled for 2026-10-15/i);
  });

  it('allows Program Head to schedule on the exact official date', async () => {
    // Official Midterm date is '2026-10-15'
    await expect(
      examSchedulesService.validateExamPayload({
        term: 'Midterm',
        examDate: '2026-10-15', // Official date
        startTime: '08:00',
        endTime: '10:00',
        subjectCode: 'IT101',
        program: 'BSIT',
        user: programHeadUser,
      })
    ).resolves.not.toThrow();
  });
});

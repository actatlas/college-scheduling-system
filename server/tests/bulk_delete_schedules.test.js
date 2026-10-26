import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('../utils/db');
const { schedulesService } = require('../services/schedules.service');
const schedulesController = require('../controllers/schedules.controller');

describe('Bulk Deletion of Multiple Class Schedules at Once', () => {
  const adminUser = { id: 1, role: 'admin', email: 'admin@srcb.edu.ph', name: 'Dean Admin' };
  const deanUser = { id: 2, role: 'dean', email: 'dean@srcb.edu.ph', name: 'Academic Dean' };
  const itHead = { id: 3, role: 'program_head', program: 'ITP', email: 'ithead@srcb.edu.ph', name: 'Dr. Turing' };
  const teacherUser = { id: 4, role: 'teacher', email: 'teacher@srcb.edu.ph', name: 'Prof. Ada' };

  let mockSchedules = [];

  beforeEach(() => {
    mockSchedules = [
      { id: 101, subject_code: 'IT101', section_id: 1, faculty_id: 'T-01', day: 'Monday', time: '07:30 AM - 09:00 AM', program_code: 'ITP' },
      { id: 102, subject_code: 'IT102', section_id: 1, faculty_id: 'T-02', day: 'Monday', time: '07:30 AM - 09:00 AM', program_code: 'ITP' },
      { id: 103, subject_code: 'HM101', section_id: 2, faculty_id: 'T-03', day: 'Tuesday', time: '10:00 AM - 12:00 PM', program_code: 'HMP' },
    ];

    db.setQueryExecutor(async (sql, params = []) => {
      const s = String(sql || '').replace(/\s+/g, ' ').trim();

      if (s.startsWith('ALTER TABLE') || s.startsWith('UPDATE sections')) {
        return [];
      }

      if (s.includes('FROM schedules sc') && s.includes('WHERE sc.id IN')) {
        const ids = params.map(Number);
        return mockSchedules
          .filter((r) => ids.includes(Number(r.id)))
          .map((r) => ({
            id: r.id,
            program_code: r.program_code,
            course_code: r.program_code,
          }));
      }

      if (s.includes('DELETE FROM schedules WHERE id IN')) {
        const ids = params.map(Number);
        const beforeCount = mockSchedules.length;
        mockSchedules = mockSchedules.filter((r) => !ids.includes(Number(r.id)));
        const affectedRows = beforeCount - mockSchedules.length;
        return [{ affectedRows }];
      }

      if (s.includes('DELETE FROM schedules WHERE id = ?')) {
        const id = Number(params[0]);
        mockSchedules = mockSchedules.filter((r) => Number(r.id) !== id);
        return [{ affectedRows: 1 }];
      }

      return [];
    });
  });

  it('1. Allows the Admin and Dean to bulk delete multiple class schedules at once', async () => {
    const res = await schedulesService.bulkDeleteSchedules([101, 102], adminUser);
    expect(res.deletedCount).toBe(2);
    expect(res.deletedIds).toEqual([101, 102]);
    expect(mockSchedules.find((s) => s.id === 101)).toBeUndefined();
    expect(mockSchedules.find((s) => s.id === 102)).toBeUndefined();
    expect(mockSchedules.find((s) => s.id === 103)).toBeDefined();
  });

  it('2. Allows the Dean to bulk delete class schedules', async () => {
    const res = await schedulesService.bulkDeleteSchedules([103], deanUser);
    expect(res.deletedCount).toBe(1);
    expect(mockSchedules.find((s) => s.id === 103)).toBeUndefined();
  });

  it('3. Rejects Teachers from deleting schedules with 403 UNAUTHORIZED_ROLE', async () => {
    await expect(schedulesService.bulkDeleteSchedules([101, 102], teacherUser)).rejects.toThrow(
      /Teachers have read-only access/i
    );
  });

  it('4. Allows Program Heads to delete their own department schedules, but blocks cross-department', async () => {
    // IT Program Head deleting ITP schedules
    const res = await schedulesService.bulkDeleteSchedules([101, 102], itHead);
    expect(res.deletedCount).toBe(2);

    // IT Program Head attempting to delete HMP schedule 103
    await expect(schedulesService.bulkDeleteSchedules([103], itHead)).rejects.toThrow(
      /Program Heads can only delete schedules within their assigned program/i
    );
  });

  it('5. Controller handles bulk-delete endpoint and returns formatted response', async () => {
    const req = {
      user: adminUser,
      body: { ids: [101, 102] },
    };
    let jsonResult = null;
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        jsonResult = data;
        return this;
      },
    };
    const next = () => {};

    await schedulesController.bulkDeleteSchedules(req, res, next);
    expect(jsonResult).not.toBeNull();
    expect(jsonResult.data.deletedCount).toBe(2);
    expect(jsonResult.data.deletedIds).toEqual([101, 102]);
  });
});

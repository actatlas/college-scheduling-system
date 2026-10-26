import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('../utils/db');
const { facultyService } = require('../services/faculty.service');
const facultyController = require('../controllers/faculty.controller');

describe('Faculty Directory Bulk Actions (Delete & Remove/Deactivate)', () => {
  const deanUser = { id: 1, role: 'dean', email: 'dean@srcb.edu.ph', name: 'Academic Dean' };
  const adminUser = { id: 2, role: 'admin', email: 'admin@srcb.edu.ph', name: 'System Admin' };
  const teacherUser = { id: 3, role: 'teacher', email: 'teacher@srcb.edu.ph', name: 'Regular Teacher' };

  let mockTeachers = [];

  beforeEach(() => {
    mockTeachers = [
      { id: 'T-001', name: 'Prof. Alice', email: 'alice@srcb.edu.ph', status: 'Full-Time' },
      { id: 'T-002', name: 'Prof. Bob', email: 'bob@srcb.edu.ph', status: 'Full-Time' },
      { id: 'T-003', name: 'Prof. Charlie', email: 'charlie@srcb.edu.ph', status: 'Part-Time' },
    ];

    db.setQueryExecutor(async (sql, params = []) => {
      const s = String(sql || '').replace(/\s+/g, ' ').trim();

      if (s.includes('SELECT email FROM teachers WHERE id = ?')) {
        const t = mockTeachers.find((m) => m.id === params[0]);
        return t ? [{ email: t.email }] : [];
      }

      if (s.includes('DELETE FROM teachers WHERE id = ?')) {
        mockTeachers = mockTeachers.filter((m) => m.id !== params[0]);
        return [{ affectedRows: 1 }];
      }

      if (s.includes('UPDATE teachers SET status = ? WHERE id = ?')) {
        const [newStatus, id] = params;
        const t = mockTeachers.find((m) => m.id === id);
        if (t) t.status = newStatus;
        return [{ affectedRows: 1 }];
      }

      if (s.includes('DELETE FROM users') || s.includes('DELETE FROM schedules') || s.includes('DELETE FROM exam_schedules')) {
        return [{ affectedRows: 1 }];
      }

      return [];
    });
  });

  it('1. Allows bulk deleting multiple faculty members at once', async () => {
    const result = await facultyService.bulkDeleteFaculty(['T-001', 'T-002']);
    expect(result.deletedCount).toBe(2);
    expect(mockTeachers.map((t) => t.id)).toEqual(['T-003']);
  });

  it('2. Allows bulk removing/deactivating faculty members to Inactive status', async () => {
    const result = await facultyService.bulkRemoveFaculty(['T-001', 'T-003'], 'deactivate');
    expect(result.updatedCount).toBe(2);
    expect(mockTeachers.find((t) => t.id === 'T-001')?.status).toBe('Inactive');
    expect(mockTeachers.find((t) => t.id === 'T-003')?.status).toBe('Inactive');
    expect(mockTeachers.find((t) => t.id === 'T-002')?.status).toBe('Full-Time');
  });

  it('3. Controller blocks unauthorized teacher role from bulk deleting faculty', async () => {
    const req = {
      user: teacherUser,
      body: { ids: ['T-001', 'T-002'] },
    };
    const res = {
      status: (code) => ({
        json: (data) => ({ statusCode: code, ...data }),
      }),
    };

    const response = await facultyController.bulkDeleteFaculty(req, res, () => {});
    expect(response.statusCode).toBe(403);
    expect(response.error).toMatch(/Forbidden/i);
  });

  it('4. Controller allows Dean/Admin to bulk delete and logs action', async () => {
    let sentJson = null;
    const req = {
      user: deanUser,
      body: { ids: ['T-001', 'T-002'] },
    };
    const res = {
      json: (data) => {
        sentJson = data;
        return data;
      },
    };

    await facultyController.bulkDeleteFaculty(req, res, () => {});
    expect(sentJson).toBeDefined();
    expect(sentJson.deletedCount).toBe(2);
  });
});

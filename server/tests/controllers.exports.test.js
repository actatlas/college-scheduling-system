import { describe, it, expect } from 'vitest';

describe('controllers exports', () => {
  it('subjects controller exports functions', async () => {
    const subjects = await import('../controllers/subjects.controller.js');
    expect(typeof subjects.listSubjects).toBe('function');
    expect(typeof subjects.createSubject).toBe('function');
    expect(typeof subjects.deleteSubject).toBe('function');
    expect(typeof subjects.updateSubject).toBe('function');
  });

  it('rooms controller exports functions', async () => {
    const rooms = await import('../controllers/rooms.controller.js');
    expect(typeof rooms.listRooms).toBe('function');
    expect(typeof rooms.createRoom).toBe('function');
    expect(typeof rooms.deleteRoom).toBe('function');
    expect(typeof rooms.updateRoom).toBe('function');
  });

  it('schedules controller exports functions', async () => {
    const schedules = await import('../controllers/schedules.controller.js');
    expect(typeof schedules.listSchedules).toBe('function');
    expect(typeof schedules.createSchedule).toBe('function');
    expect(typeof schedules.deleteSchedule).toBe('function');
    expect(typeof schedules.updateSchedule).toBe('function');
  });
});

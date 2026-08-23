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
    expect(typeof schedules.listConflicts).toBe('function');
    expect(typeof schedules.generateSchedules).toBe('function');
  });

  it('courses and programs controllers export full CRUD functions', async () => {
    const courses = await import('../controllers/courses.controller.js');
    expect(typeof courses.listCourses).toBe('function');
    expect(typeof courses.createCourse).toBe('function');
    expect(typeof courses.updateCourse).toBe('function');
    expect(typeof courses.deleteCourse).toBe('function');

    const programs = await import('../controllers/programs.controller.js');
    expect(typeof programs.listPrograms).toBe('function');
    expect(typeof programs.createProgram).toBe('function');
    expect(typeof programs.updateProgram).toBe('function');
    expect(typeof programs.deleteProgram).toBe('function');
  });

  it('examSchedules and faculty controllers export functions', async () => {
    const examSchedules = await import('../controllers/examSchedules.controller.js');
    expect(typeof examSchedules.listExamSchedules).toBe('function');
    expect(typeof examSchedules.createExamSchedule).toBe('function');
    expect(typeof examSchedules.updateExamSchedule).toBe('function');
    expect(typeof examSchedules.deleteExamSchedule).toBe('function');

    const faculty = await import('../controllers/faculty.controller.js');
    expect(typeof faculty.listFaculty).toBe('function');
    expect(typeof faculty.createFaculty).toBe('function');
    expect(typeof faculty.updateFaculty).toBe('function');
    expect(typeof faculty.deleteFaculty).toBe('function');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('../utils/db');
const { schedulesService } = require('../services/schedules.service');
const { getFacultyScheduleDetails, dispatchScheduleToFaculty } = require('../services/facultyDispatch.service');
const { listSystemLogs } = require('../services/systemLogs.service');

describe('Schedule Lifecycle, Finalization & Publication Workflow', () => {
  const adminUser = { id: 1, sub: 1, role: 'admin', email: 'admin@srcb.edu.ph', name: 'Dean Admin' };
  const dsaUser = { id: 8, sub: 8, role: 'dsa', email: 'dsa@srcb.edu.ph', name: 'DSA Administrator' };
  const itHead = { id: 2, sub: 2, role: 'program_head', program: 'ITP', email: 'ithead@srcb.edu.ph', name: 'Dr. Alan Turing' };
  const hmHead = { id: 4, sub: 4, role: 'program_head', program: 'HMP', email: 'bshmhead@srcb.edu.ph', name: 'Chef Gordon' };
  const teacherUser = { id: 7, sub: 7, role: 'teacher', teacherId: 'T-IT-001', email: 'adalovelace-it@srcb.edu.ph', name: 'Prof. Ada Lovelace' };

  let mockSchedules = [];
  let mockSubjects = [
    { code: 'IT101', name: 'Intro to Programming', units: 3, lecture_hours: 2, lab_hours: 3, program_code: 'ITP' },
    { code: 'HM101', name: 'Hospitality Ops', units: 3, lecture_hours: 3, lab_hours: 0, program_code: 'HMP' },
    { code: 'GE101', name: 'Understanding Self', units: 3, lecture_hours: 3, lab_hours: 0, program_code: 'ALL' },
  ];
  let mockSections = [
    { id: 1, course_code: 'BSIT', year_level: '1st Year', section_label: 'A', students: 35 },
    { id: 2, course_code: 'BSHM', year_level: '1st Year', section_label: 'A', students: 30 },
  ];
  let mockTeachers = [
    { id: 'T-IT-001', name: 'Prof. Ada Lovelace', email: 'adalovelace-it@srcb.edu.ph', status: 'Full-Time', department: 'ITP' },
    { id: 'T-HM-001', name: 'Chef Gordon Ramsay', email: 'gordonramsay-hm@srcb.edu.ph', status: 'Full-Time', department: 'HMP' },
  ];
  let mockRooms = [
    { number: 'LAB-101', capacity: 40, building: 'College Building', type: 'Laboratory', status: 'Available' },
    { number: 'COL-101', capacity: 40, building: 'College Building', type: 'Lecture', status: 'Available' },
  ];

  beforeEach(() => {
    mockSchedules = [
      {
        id: 1,
        day: 'Monday',
        start_time: '08:00:00',
        end_time: '11:00:00',
        subject_code: 'IT101',
        section_id: 1,
        faculty_id: 'T-IT-001',
        room_number: 'LAB-101',
        color: '#800000',
        status: 'DRAFT',
      },
      {
        id: 2,
        day: 'Tuesday',
        start_time: '08:00:00',
        end_time: '11:00:00',
        subject_code: 'HM101',
        section_id: 2,
        faculty_id: 'T-HM-001',
        room_number: 'COL-101',
        color: '#15803d',
        status: 'DRAFT',
      },
    ];

    db.setQueryExecutor(async (sql, params) => {
      const s = String(sql || '').replace(/\s+/g, ' ').trim();

      if (s.startsWith('ALTER TABLE')) {
        return [];
      }

      if (s.includes('FROM subjects WHERE code = ?')) {
        const sub = mockSubjects.find((x) => x.code === params[0]);
        return sub ? [sub] : [];
      }

      if (s.includes('FROM teachers WHERE id = ?')) {
        const t = mockTeachers.find((x) => x.id === params[0]);
        return t ? [t] : [];
      }

      if (s.includes('FROM teachers WHERE email = ?')) {
        const t = mockTeachers.find((x) => x.email === params[0] || x.name === params[0]);
        return t ? [t] : [];
      }

      if (s.includes('FROM rooms WHERE number = ?')) {
        const r = mockRooms.find((x) => x.number === params[0]);
        return r ? [r] : [];
      }

      if (s.includes('FROM sections WHERE id = ?')) {
        const sec = mockSections.find((x) => Number(x.id) === Number(params[0]));
        return sec ? [sec] : [];
      }

      if (s.includes('FROM schedules sc') || s.includes('FROM schedules s') || s.includes('FROM schedules')) {
        if (s.includes('WHERE sc.id = ?') || s.includes('WHERE s.id = ?') || s.includes('WHERE id = ?')) {
          const id = Number(params?.[0]);
          const found = mockSchedules.find((item) => Number(item.id) === id);
          if (!found) return [];
          const sub = mockSubjects.find((x) => x.code === found.subject_code);
          const sec = mockSections.find((x) => Number(x.id) === Number(found.section_id));
          const t = mockTeachers.find((x) => x.id === found.faculty_id);
          const r = mockRooms.find((x) => x.number === found.room_number);
          return [{
            ...found,
            subject_name: sub?.name || found.subject_code,
            program_code: sub?.program_code || 'ITP',
            lab_hours: sub?.lab_hours || 0,
            lecture_hours: sub?.lecture_hours || 0,
            faculty_name: t?.name || '',
            faculty_status: t?.status || 'Full-Time',
            room_type: r?.type || 'Lecture',
            room_capacity: r?.capacity || 40,
            section_name: sec ? `${sec.course_code} ${sec.year_level}-${sec.section_label}` : '',
            section_course_code: sec?.course_code || 'BSIT',
            year_level: sec?.year_level || '1st Year',
            course_code: sec?.course_code || 'BSIT',
          }];
        }

        if (s.includes('WHERE (s.faculty_id = ? OR s.faculty_name = ?)') || s.includes('WHERE s.faculty_id = ?')) {
          const fid = params[0];
          let matched = mockSchedules.filter((sc) => sc.faculty_id === fid);
          if (s.includes("AND (s.status = 'PUBLISHED' OR s.status = 'Confirmed')")) {
            matched = matched.filter((sc) => sc.status === 'PUBLISHED' || sc.status === 'Confirmed');
          }
          return matched.map((found) => {
            const sub = mockSubjects.find((x) => x.code === found.subject_code);
            const sec = mockSections.find((x) => Number(x.id) === Number(found.section_id));
            return {
              ...found,
              subject_name: sub?.name || found.subject_code,
              units: sub?.units || 3,
              lecture_hours: sub?.lecture_hours || 2,
              lab_hours: sub?.lab_hours || 3,
              section_name: sec ? `${sec.course_code} ${sec.year_level}-${sec.section_label}` : '',
              program_code: sec?.course_code || 'BSIT',
              class_mode: 'Laboratory',
              modality: 'Face-to-Face',
            };
          });
        }

        if (s.includes('WHERE id != ?')) {
          const excludeId = Number(params[0]);
          return mockSchedules.filter((sc) => Number(sc.id) !== excludeId);
        }

        return mockSchedules.map((found) => {
          const sub = mockSubjects.find((x) => x.code === found.subject_code);
          const sec = mockSections.find((x) => Number(x.id) === Number(found.section_id));
          const t = mockTeachers.find((x) => x.id === found.faculty_id);
          const r = mockRooms.find((x) => x.number === found.room_number);
          return {
            ...found,
            subject_name: sub?.name || found.subject_code,
            program_code: sub?.program_code || 'ITP',
            lab_hours: sub?.lab_hours || 0,
            lecture_hours: sub?.lecture_hours || 0,
            faculty_name: t?.name || '',
            faculty_status: t?.status || 'Full-Time',
            room_type: r?.type || 'Lecture',
            room_capacity: r?.capacity || 40,
            section_name: sec ? `${sec.course_code} ${sec.year_level}-${sec.section_label}` : '',
            section_course_code: sec?.course_code || 'BSIT',
            year_level: sec?.year_level || '1st Year',
            course_code: sec?.course_code || 'BSIT',
          };
        });
      }

      if (s.startsWith('INSERT INTO schedules')) {
        const newId = mockSchedules.length + 1;
        const newSched = {
          id: newId,
          day: params[0],
          start_time: params[1],
          end_time: params[2],
          subject_code: params[3],
          section_id: params[4],
          faculty_id: params[5],
          room_number: params[6],
          color: params[7],
          status: params[8] || 'DRAFT',
        };
        mockSchedules.push(newSched);
        return [{ insertId: newId }];
      }

      if (s.startsWith('UPDATE schedules SET')) {
        if (s.includes('status = "FINALIZED" WHERE id = ?')) {
          const id = Number(params[0]);
          const found = mockSchedules.find((x) => Number(x.id) === id);
          if (found) found.status = 'FINALIZED';
          return [{ affectedRows: 1 }];
        }
        if (s.includes('status = "PUBLISHED" WHERE id = ?')) {
          const id = Number(params[0]);
          const found = mockSchedules.find((x) => Number(x.id) === id);
          if (found) found.status = 'PUBLISHED';
          return [{ affectedRows: 1 }];
        }
        if (s.includes('SET status = ? WHERE id IN')) {
          const newStatus = params[0];
          const targetIds = params.slice(1).map(Number);
          mockSchedules.forEach((sc) => {
            if (targetIds.includes(Number(sc.id))) {
              sc.status = newStatus;
            }
          });
          return [{ affectedRows: targetIds.length }];
        }

        // Full update
        const id = Number(params[9]);
        const found = mockSchedules.find((x) => Number(x.id) === id);
        if (found) {
          found.day = params[0];
          found.start_time = params[1];
          found.end_time = params[2];
          found.subject_code = params[3];
          found.section_id = params[4];
          found.faculty_id = params[5];
          found.room_number = params[6];
          found.color = params[7];
          found.status = params[8];
        }
        return [{ affectedRows: 1 }];
      }

      if (s.startsWith('DELETE FROM schedules WHERE id = ?')) {
        const id = Number(params[0]);
        mockSchedules = mockSchedules.filter((x) => Number(x.id) !== id);
        return [{ affectedRows: 1 }];
      }

      return [];
    });
  });

  it('1. Initializes new schedules with DRAFT status by default', async () => {
    const created = await schedulesService.createSchedule(
      {
        day: 'Wednesday',
        start_time: '08:00:00',
        end_time: '11:00:00',
        subject_code: 'IT101',
        section_id: 1,
        faculty_id: 'T-IT-001',
        room_number: 'LAB-101',
      },
      itHead
    );

    expect(created.status).toBe('DRAFT');
    expect(mockSchedules.find((s) => Number(s.id) === Number(created.id))?.status).toBe('DRAFT');
  });

  it('2. Allows Admin and Program Head within assigned scope to Finalize schedule', async () => {
    const res = await schedulesService.finalizeSchedule(1, itHead);
    expect(res.status).toBe('FINALIZED');
    expect(mockSchedules.find((s) => s.id === 1)?.status).toBe('FINALIZED');
  });

  it('3. Blocks Program Head from finalizing or modifying a different program schedule', async () => {
    // IT Program Head trying to finalize HM schedule (id: 2)
    await expect(schedulesService.finalizeSchedule(2, itHead)).rejects.toThrow(
      /Unauthorized: Program Heads can only finalize schedules within their assigned program/i
    );

    // IT Program Head trying to update HM schedule
    await expect(
      schedulesService.updateSchedule(
        2,
        {
          day: 'Wednesday',
          start_time: '08:00:00',
          end_time: '11:00:00',
          subject_code: 'HM101',
          section_id: 2,
          faculty_id: 'T-HM-001',
          room_number: 'COL-101',
        },
        itHead
      )
    ).rejects.toThrow(/Unauthorized: Program Heads can only update schedules within their assigned program/i);
  });

  it('4. Allows Admin / DSA to publish schedules, while restricting Program Heads', async () => {
    // Program Head attempting to publish -> rejected
    await expect(schedulesService.publishSchedule(1, { notifyFaculty: false }, itHead)).rejects.toThrow(
      /Only Central Academic Administrators \(Admin\/DSA\) can publish official schedules/i
    );

    // Admin / DSA publishing -> succeeds
    const pubRes = await schedulesService.publishSchedule(1, { notifyFaculty: false }, adminUser);
    expect(pubRes.status).toBe('PUBLISHED');
    expect(mockSchedules.find((s) => s.id === 1)?.status).toBe('PUBLISHED');
  });

  it('5. Does NOT send official faculty emails for DRAFT schedules', async () => {
    // Schedule 1 is in DRAFT status
    mockSchedules[0].status = 'DRAFT';

    const details = await getFacultyScheduleDetails('T-IT-001', { onlyPublished: true });
    expect(details.schedules.length).toBe(0);
  });

  it('6. Dispatches official faculty email when schedule is PUBLISHED', async () => {
    // Mark schedule 1 as PUBLISHED
    mockSchedules[0].status = 'PUBLISHED';

    const details = await getFacultyScheduleDetails('T-IT-001', { onlyPublished: true });
    expect(details.schedules.length).toBe(1);
    expect(details.schedules[0].subject_code).toBe('IT101');

    const emailPayload = await dispatchScheduleToFaculty({
      teacherId: 'T-IT-001',
      recipientEmail: 'adalovelace-it@srcb.edu.ph',
      onlyPublished: true,
    });

    expect(emailPayload.deliveryStatus).toBe('Delivered');
    expect(emailPayload.subjectCount).toBe(1);
    expect(emailPayload.cubicleAdvisoryNote).toContain('departmental faculty cubicle');
  });

  it('7. Revalidates conflicts and sends updated notification when already published schedule is updated', async () => {
    // Initially PUBLISHED
    mockSchedules[0].status = 'PUBLISHED';

    const updated = await schedulesService.updateSchedule(
      1,
      {
        day: 'Friday',
        start_time: '08:00:00',
        end_time: '11:00:00',
        subject_code: 'IT101',
        section_id: 1,
        faculty_id: 'T-IT-001',
        room_number: 'LAB-101',
        notifyFaculty: true,
      },
      adminUser
    );

    expect(updated.day).toBe('Friday');
    expect(updated.status).toBe('PUBLISHED');
  });

  it('8. Supports Bulk Status Finalize and Publish operations', async () => {
    const bulkFin = await schedulesService.bulkUpdateScheduleStatus(
      { ids: [1, 2], status: 'FINALIZED' },
      adminUser
    );
    expect(bulkFin.updatedCount).toBe(2);
    expect(mockSchedules[0].status).toBe('FINALIZED');
    expect(mockSchedules[1].status).toBe('FINALIZED');

    const bulkPub = await schedulesService.bulkUpdateScheduleStatus(
      { ids: [1, 2], status: 'PUBLISHED', notifyFaculty: false },
      adminUser
    );
    expect(bulkPub.updatedCount).toBe(2);
    expect(mockSchedules[0].status).toBe('PUBLISHED');
    expect(mockSchedules[1].status).toBe('PUBLISHED');
  });
});

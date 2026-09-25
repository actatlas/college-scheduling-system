import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { setQueryExecutor } = require('../utils/db');
const { scheduleAdjustmentRequestsService } = require('../services/scheduleAdjustmentRequests.service');
const { notificationsService } = require('../services/notifications.service');

describe('Schedule Adjustment Requests Workflow (Program Head → Admin)', () => {
  let mockUsers = [];
  let mockSchedules = [];
  let mockSubjects = [];
  let mockTeachers = [];
  let mockRooms = [];
  let mockSections = [];
  let mockRequests = [];
  let mockNotifications = [];

  const programHeadIT = {
    id: 3,
    sub: 3,
    name: 'Dr. Alan Turing',
    email: 'ph_it@srcb.edu.ph',
    role: 'program_head',
    program: 'BSIT',
    programCode: 'ITP',
  };

  const programHeadCJEP = {
    id: 6,
    sub: 6,
    name: 'Chief Stone',
    email: 'ph_crim@srcb.edu.ph',
    role: 'program_head',
    program: 'BSCRIM',
    programCode: 'CJEP',
  };

  const admin = {
    id: 2,
    sub: 2,
    name: 'Dean College Admin',
    email: 'admin@srcb.edu.ph',
    role: 'admin',
  };

  const teacherMaria = {
    id: 4,
    sub: 4,
    name: 'Maria Santos',
    email: 'maria@srcb.edu.ph',
    role: 'teacher',
  };

  const superAdmin = {
    id: 1,
    sub: 1,
    name: 'Super Admin',
    email: 'superadmin@srcb.edu.ph',
    role: 'super_admin',
  };

  beforeEach(() => {
    mockUsers = [
      { id: 1, name: 'Super Admin', role: 'super_admin' },
      { id: 2, name: 'Dean College Admin', role: 'admin' },
      { id: 3, name: 'Dr. Alan Turing', role: 'program_head', program: 'BSIT', programCode: 'ITP' },
      { id: 4, name: 'Maria Santos', role: 'teacher' },
      { id: 6, name: 'Chief Stone', role: 'program_head', program: 'BSCRIM', programCode: 'CJEP' },
    ];

    mockSubjects = [
      { code: 'GE2', name: 'Readings in Philippine History', program_code: 'ALL', lecture_hours: 1.5, lab_hours: 0 },
      { code: 'IT101', name: 'Computer Programming 1', program_code: 'ITP', lecture_hours: 2, lab_hours: 3 },
      { code: 'IT102', name: 'Data Structures', program_code: 'ITP', lecture_hours: 2, lab_hours: 0 },
    ];

    mockTeachers = [
      { id: 'T001', name: 'Prof. Ada Lovelace', status: 'Full-Time' },
      { id: 'T002', name: 'Dr. Alan Turing', status: 'Full-Time' },
    ];

    mockRooms = [
      { number: 'COL-101', capacity: 40, building: 'College Building', type: 'Lecture', status: 'Available' },
      { number: 'COL-102', capacity: 40, building: 'College Building', type: 'Lecture', status: 'Available' },
      { number: 'LAB-201', capacity: 40, building: 'College Building', type: 'Laboratory', status: 'Available' },
    ];

    mockSections = [
      { id: 1, course_code: 'BSIT', year_level: 1, section_label: 'A', students: 30 },
      { id: 2, course_code: 'BSIT', year_level: 2, section_label: 'A', students: 30 },
    ];

    mockSchedules = [
      {
        id: 1,
        day: 'Monday',
        start_time: '09:00:00',
        end_time: '10:30:00',
        subject_code: 'GE2',
        section_id: 1,
        faculty_id: 'T001',
        room_number: 'COL-101',
        color: '#2563eb',
      },
      {
        id: 2,
        day: 'Monday',
        start_time: '13:00:00',
        end_time: '15:00:00',
        subject_code: 'IT102',
        section_id: 1,
        faculty_id: 'T002',
        room_number: 'COL-101',
        color: '#800000',
      },
    ];

    mockRequests = [];
    mockNotifications = [];

    setQueryExecutor(async (sql, params = []) => {
      const s = String(sql).replace(/\s+/g, ' ').trim();

      // Notifications queries
      if (s.includes('INSERT INTO notifications')) {
        mockNotifications.push({
          id: params[0],
          title: params[1],
          message: params[2],
          type: params[3],
          link: params[4],
          target_role: params[5],
          target_user_id: params[6],
          target_program: params[7],
          target_teacher_id: params[8],
        });
        return [{ insertId: mockNotifications.length }];
      }

      if (s.includes('FROM notifications')) {
        return mockNotifications;
      }

      // Schedules queries
      if (s.includes('FROM schedules sc') || s.includes('FROM schedules WHERE sc.id = ?') || s.includes('WHERE sc.id = ?')) {
        const schedId = Number(params[0]);
        const sRow = mockSchedules.find((x) => Number(x.id) === schedId);
        if (!sRow) return [];
        const sub = mockSubjects.find((x) => x.code === sRow.subject_code);
        const t = mockTeachers.find((x) => x.id === sRow.faculty_id);
        const sec = mockSections.find((x) => Number(x.id) === Number(sRow.section_id));
        return [
          {
            ...sRow,
            subject_name: sub?.name || sRow.subject_code,
            program_code: sub?.program_code || 'ITP',
            faculty_name: t?.name || '',
            course_code: sec?.course_code || 'BSIT',
            year_level: sec?.year_level || 1,
            section_label: sec?.section_label || 'A',
          },
        ];
      }

      if (s.includes('FROM schedules WHERE id != ?')) {
        const excludeId = Number(params[0] || 0);
        return mockSchedules.filter((x) => Number(x.id) !== excludeId);
      }

      if (s.includes('FROM schedules WHERE id = ?')) {
        const found = mockSchedules.find((x) => Number(x.id) === Number(params[0]));
        return found ? [found] : [];
      }

      if (s.includes('UPDATE schedules SET')) {
        const schedId = Number(params[params.length - 1]);
        const sRow = mockSchedules.find((x) => Number(x.id) === schedId);
        if (sRow) {
          sRow.day = params[0];
          sRow.start_time = params[1];
          sRow.end_time = params[2];
          sRow.room_number = params[3];
        }
        return [{ affectedRows: 1 }];
      }

      // Subjects & Rooms
      if (s.includes('FROM subjects WHERE code = ?')) {
        const found = mockSubjects.find((x) => x.code === params[0]);
        return found ? [found] : [];
      }

      if (s.includes('FROM rooms WHERE number = ?')) {
        const found = mockRooms.find((x) => x.number === params[0]);
        return found ? [found] : [];
      }

      if (s.includes('FROM teachers WHERE id = ?')) {
        const found = mockTeachers.find((x) => x.id === params[0]);
        return found ? [found] : [];
      }

      if (s.includes('FROM sections WHERE id = ?')) {
        const found = mockSections.find((x) => Number(x.id) === Number(params[0]));
        return found ? [found] : [];
      }

      // Adjustment Requests
      if (s.includes('FROM schedule_adjustment_requests WHERE schedule_id = ? AND status = "Pending"')) {
        const schedId = Number(params[0]);
        const found = mockRequests.filter((r) => Number(r.schedule_id) === schedId && r.status === 'Pending');
        return found;
      }

      if (s.includes('INSERT INTO schedule_adjustment_requests')) {
        const newId = mockRequests.length + 1;
        const newReq = {
          id: newId,
          schedule_id: params[0],
          requested_by_user_id: params[1],
          requester_name: params[2],
          requester_program: params[3],
          program_id: params[4],
          subject_code: params[5],
          subject_name: params[6],
          section_id: params[7],
          section_name: params[8],
          faculty_name: params[9],
          room_number: params[10],
          current_day: params[11],
          current_start_time: params[12],
          current_end_time: params[13],
          suggested_day: params[14],
          suggested_start_time: params[15],
          suggested_end_time: params[16],
          suggested_room: params[17],
          requested_action: params[18] || 'SCHEDULE_ADJUSTMENT',
          reason: params[19],
          status: params[20] || 'Pending',
          admin_response: null,
          admin_remarks: null,
          reviewed_by_user_id: null,
          reviewed_by_name: null,
          reviewed_at: null,
          created_at: new Date().toISOString(),
        };
        mockRequests.push(newReq);
        return [{ insertId: newId }];
      }

      if (s.includes('FROM schedule_adjustment_requests WHERE id = ?')) {
        const reqId = Number(params[0]);
        const found = mockRequests.find((r) => Number(r.id) === reqId);
        return found ? [found] : [];
      }

      if (s.includes('FROM schedule_adjustment_requests WHERE 1=1')) {
        return mockRequests;
      }

      if (s.includes('UPDATE schedule_adjustment_requests') && (s.includes('Approved') || s.includes("status = 'Approved'"))) {
        const reqId = Number(params[params.length - 1]);
        const r = mockRequests.find((x) => Number(x.id) === reqId);
        if (r) {
          r.status = 'Approved';
          r.admin_response = params[0];
          r.admin_remarks = params[1] || params[0];
          r.reviewed_by_user_id = params[2];
          r.reviewed_by_name = params[3];
          r.reviewed_at = new Date().toISOString();
        }
        return [{ affectedRows: 1 }];
      }

      if (s.includes('UPDATE schedule_adjustment_requests') && (s.includes('Rejected') || s.includes("SET status = 'Rejected'"))) {
        const reqId = Number(params[params.length - 1]);
        const r = mockRequests.find((x) => Number(x.id) === reqId);
        if (r) {
          r.status = 'Rejected';
          r.admin_response = params[0];
          r.admin_remarks = params[1] || params[0];
          r.reviewed_by_user_id = params[2];
          r.reviewed_by_name = params[3];
          r.reviewed_at = new Date().toISOString();
        }
        return [{ affectedRows: 1 }];
      }

      return [];
    });
  });

  describe('1. Program Head Request Submission Flow', () => {
    it('allows Program Head to submit a schedule adjustment request with reason and suggested time', async () => {
      const result = await scheduleAdjustmentRequestsService.createAdjustmentRequest(
        {
          scheduleId: 1,
          reason: 'This schedule is blocking a continuous Major Subject scheduling period.',
          suggestedDay: 'Monday',
          suggestedStartTime: '07:30 AM',
          suggestedEndTime: '09:00 AM',
          suggestedRoom: 'COL-101',
        },
        programHeadIT
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.scheduleId).toBe(1);
      expect(result.subjectCode).toBe('GE2');
      expect(result.status).toBe('Pending');
      expect(result.requesterName).toBe('Dr. Alan Turing');
      expect(result.requesterProgram).toBe('ITP');
      expect(result.suggestedDay).toBe('Monday');
      expect(result.suggestedStartTime).toBe('07:30');
      expect(result.suggestedEndTime).toBe('09:00');
    });

    it('dispatches a notification to Admin when a request is submitted', async () => {
      await scheduleAdjustmentRequestsService.createAdjustmentRequest(
        {
          scheduleId: 1,
          reason: 'Need major subject slot',
          suggestedDay: 'Monday',
          suggestedStartTime: '07:30 AM',
          suggestedEndTime: '09:00 AM',
        },
        programHeadIT
      );

      expect(mockNotifications.length).toBeGreaterThan(0);
      const adminNotif = mockNotifications.find(
        (n) => n.target_role === 'admin' && n.message.includes('Program Head requested a schedule adjustment')
      );
      expect(adminNotif).toBeDefined();
      expect(adminNotif.message).toBe('Program Head requested a schedule adjustment for GE2.');
      expect(adminNotif.link).toContain('/schedules?requestId=');
    });

    it('prevents duplicate pending requests for the same schedule (HTTP 409 DUPLICATE_PENDING_REQUEST)', async () => {
      await scheduleAdjustmentRequestsService.createAdjustmentRequest(
        {
          scheduleId: 1,
          reason: 'First request',
          suggestedDay: 'Monday',
          suggestedStartTime: '07:30 AM',
        },
        programHeadIT
      );

      await expect(
        scheduleAdjustmentRequestsService.createAdjustmentRequest(
          {
            scheduleId: 1,
            reason: 'Second duplicate request',
            suggestedDay: 'Monday',
            suggestedStartTime: '07:30 AM',
          },
          programHeadIT
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'DUPLICATE_PENDING_REQUEST',
      });
    });

    it('rejects submission by Teachers (403 UNAUTHORIZED_ROLE)', async () => {
      await expect(
        scheduleAdjustmentRequestsService.createAdjustmentRequest(
          {
            scheduleId: 1,
            reason: 'Teacher attempting to request move',
          },
          teacherMaria
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'UNAUTHORIZED_ROLE',
      });
    });

    it('rejects submission by Super Admin (403 UNAUTHORIZED_ROLE)', async () => {
      await expect(
        scheduleAdjustmentRequestsService.createAdjustmentRequest(
          {
            scheduleId: 1,
            reason: 'Super Admin attempting to submit',
          },
          superAdmin
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'UNAUTHORIZED_ROLE',
      });
    });
  });

  describe('2. Admin Review, Approval & Conflict Validation Flow', () => {
    let createdReq = null;

    beforeEach(async () => {
      createdReq = await scheduleAdjustmentRequestsService.createAdjustmentRequest(
        {
          scheduleId: 1,
          reason: 'This schedule is blocking a continuous Major Subject scheduling period.',
          suggestedDay: 'Monday',
          suggestedStartTime: '07:30 AM',
          suggestedEndTime: '09:00 AM',
          suggestedRoom: 'COL-101',
        },
        programHeadIT
      );
    });

    it('Admin can approve a valid schedule adjustment and update the timetable schedule', async () => {
      const approveResult = await scheduleAdjustmentRequestsService.approveAdjustmentRequest(
        createdReq.id,
        {
          day: 'Monday',
          startTime: '07:30 AM',
          endTime: '09:00 AM',
          room: 'COL-101',
          adminResponse: 'Approved. Moving GE2 to 7:30 AM slot.',
        },
        admin
      );

      expect(approveResult.success).toBe(true);
      expect(approveResult.request.status).toBe('Approved');
      expect(approveResult.request.adminResponse).toBe('Approved. Moving GE2 to 7:30 AM slot.');

      // Verify schedule was updated
      const updatedSched = mockSchedules.find((s) => s.id === 1);
      expect(updatedSched.start_time).toBe('07:30:00');
      expect(updatedSched.end_time).toBe('09:00:00');

      // Verify Program Head received notification
      const phNotif = mockNotifications.find(
        (n) => n.target_role === 'program_head' && n.message.includes('Admin approved schedule adjustment for GE2')
      );
      expect(phNotif).toBeDefined();
    });

    it('Admin approval with conflict is rejected without corrupting schedule', async () => {
      // Schedule 2 occupies Monday 13:00-15:00 in COL-101 with T002.
      // Trying to approve moving schedule 1 to Monday 13:30-15:00 in COL-101 (overlaps with schedule 2 in room COL-101)
      await expect(
        scheduleAdjustmentRequestsService.approveAdjustmentRequest(
          createdReq.id,
          {
            day: 'Monday',
            startTime: '01:30 PM',
            endTime: '03:00 PM',
            room: 'COL-101',
            adminResponse: 'Approve to conflicting slot',
          },
          admin
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'ROOM_CONFLICT',
      });

      // Target schedule remains in original slot
      const sched1 = mockSchedules.find((s) => s.id === 1);
      expect(sched1.start_time).toBe('09:00:00');
    });

    it('Admin can reject an adjustment request with reason and leave schedule unchanged', async () => {
      const rejectResult = await scheduleAdjustmentRequestsService.rejectAdjustmentRequest(
        createdReq.id,
        {
          adminResponse: 'Cannot accommodate this move due to room maintenance during early morning.',
        },
        admin
      );

      expect(rejectResult.success).toBe(true);
      expect(rejectResult.request.status).toBe('Rejected');
      expect(rejectResult.request.adminResponse).toContain('room maintenance');

      // Schedule 1 remains unchanged
      const sched1 = mockSchedules.find((s) => s.id === 1);
      expect(sched1.start_time).toBe('09:00:00');
      expect(sched1.end_time).toBe('10:30:00');

      // Program Head received rejection notification with reason
      const phNotif = mockNotifications.find(
        (n) => n.target_role === 'program_head' && n.message.includes('Admin rejected schedule adjustment for GE2')
      );
      expect(phNotif).toBeDefined();
    });

    it('rejects re-processing an already approved or rejected request', async () => {
      await scheduleAdjustmentRequestsService.rejectAdjustmentRequest(
        createdReq.id,
        { adminResponse: 'Rejected' },
        admin
      );

      await expect(
        scheduleAdjustmentRequestsService.approveAdjustmentRequest(
          createdReq.id,
          { day: 'Monday', startTime: '07:30 AM', endTime: '09:00 AM' },
          admin
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_REQUEST_STATUS',
      });
    });

    it('Program Head or Teacher cannot approve adjustment requests (403 UNAUTHORIZED_ROLE)', async () => {
      await expect(
        scheduleAdjustmentRequestsService.approveAdjustmentRequest(
          createdReq.id,
          { day: 'Monday', startTime: '07:30 AM', endTime: '09:00 AM' },
          programHeadIT
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'UNAUTHORIZED_ROLE',
      });

      await expect(
        scheduleAdjustmentRequestsService.approveAdjustmentRequest(
          createdReq.id,
          { day: 'Monday', startTime: '07:30 AM', endTime: '09:00 AM' },
          teacherMaria
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'UNAUTHORIZED_ROLE',
      });
    });
  });

  describe('3. Scoped Permission Actions (CREATE, MODIFY, DELETE) & Cross-Program Security', () => {
    it('allows Program Head to request CREATE_SCHEDULE for a subject in their assigned program', async () => {
      const result = await scheduleAdjustmentRequestsService.createAdjustmentRequest(
        {
          subjectCode: 'IT101',
          subjectName: 'Computer Programming 1',
          sectionName: 'BSIT 1-A',
          requestedAction: 'CREATE_SCHEDULE',
          reason: 'Need approval to add a laboratory section block for 1st Year BSIT.',
          suggestedDay: 'Wednesday',
          suggestedStartTime: '01:00 PM',
          suggestedEndTime: '04:00 PM',
          suggestedRoom: 'LAB-201',
        },
        programHeadIT
      );

      expect(result).toBeDefined();
      expect(result.requestedAction).toBe('CREATE_SCHEDULE');
      expect(result.subjectCode).toBe('IT101');
      expect(result.requesterProgram).toBe('ITP');
      expect(result.status).toBe('Pending');
    });

    it('blocks Program Head from requesting permission for a subject outside their assigned program (403 UNAUTHORIZED_PROGRAM_ACCESS)', async () => {
      mockSubjects.push({ code: 'CRIM101', name: 'Intro to Criminology', program_code: 'CJEP' });

      await expect(
        scheduleAdjustmentRequestsService.createAdjustmentRequest(
          {
            subjectCode: 'CRIM101',
            subjectName: 'Intro to Criminology',
            requestedAction: 'CREATE_SCHEDULE',
            reason: 'IT Program Head trying to schedule Criminology subject',
          },
          programHeadIT
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'UNAUTHORIZED_PROGRAM_ACCESS',
      });
    });

    it('allows Admin to approve a CREATE_SCHEDULE request and record Admin Remarks', async () => {
      const req = await scheduleAdjustmentRequestsService.createAdjustmentRequest(
        {
          subjectCode: 'IT101',
          subjectName: 'Computer Programming 1',
          requestedAction: 'CREATE_SCHEDULE',
          reason: 'Adding lab cohort',
        },
        programHeadIT
      );

      const approval = await scheduleAdjustmentRequestsService.approveAdjustmentRequest(
        req.id,
        {
          adminRemarks: 'Granted: Authorization for IT101 lab scheduling issued for AY 2026-2027.',
        },
        admin
      );

      expect(approval.success).toBe(true);
      expect(approval.request.status).toBe('Approved');
      expect(approval.request.adminRemarks).toContain('Authorization for IT101');
      expect(approval.request.reviewedByName).toBe('Dean College Admin');
    });

    it('allows Admin to reject a DELETE_SCHEDULE request with clear remarks', async () => {
      const req = await scheduleAdjustmentRequestsService.createAdjustmentRequest(
        {
          scheduleId: 1,
          requestedAction: 'DELETE_SCHEDULE',
          reason: 'Requesting to cancel General Education subject block',
        },
        programHeadIT
      );

      const rejection = await scheduleAdjustmentRequestsService.rejectAdjustmentRequest(
        req.id,
        {
          adminRemarks: 'Rejected: GE2 is a mandatory core curriculum subject required for CHED compliance.',
        },
        admin
      );

      expect(rejection.success).toBe(true);
      expect(rejection.request.status).toBe('Rejected');
      expect(rejection.request.adminRemarks).toContain('CHED compliance');
    });
  });
});

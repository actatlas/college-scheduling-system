import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  listDelegations,
  hasPrivilege,
  grantOrRevokePrivileges,
} = require('../services/delegations.service');
const {
  dispatchScheduleToFaculty,
  getFacultyScheduleDetails,
} = require('../services/facultyDispatch.service');
const { examSchedulesService } = require('../services/examSchedules.service');
const { listSystemLogs } = require('../services/systemLogs.service');

describe('Backend Delegations & Faculty Gmail Dispatch Suite', () => {
  beforeEach(async () => {
    const dels = await listDelegations();
    const bsbaHead = dels.find((d) => d.programCode === 'BSBA' || d.userEmail?.includes('businesshead'));
    if (bsbaHead) {
      await grantOrRevokePrivileges({
        userId: bsbaHead.userId,
        programCode: 'BSBA',
        privileges: ['MANAGE_CLASS_SCHEDULE', 'ROOM_REALLOCATION'],
        grantedBy: 2,
      });
    }
  });

  it('1. lists delegations across program heads', async () => {
    const dels = await listDelegations();
    expect(Array.isArray(dels)).toBe(true);
    expect(dels.length).toBeGreaterThanOrEqual(1);

    const itHead = dels.find((d) => d.programCode === 'BSIT' || d.userEmail?.includes('ithead'));
    expect(itHead).toBeDefined();
    expect(itHead.hasExamSchedulePrivilege).toBe(true);
  });

  it('2. checks privilege helper accurately for program and user', async () => {
    const dels = await listDelegations();
    const itHead = dels.find((d) => d.programCode === 'BSIT' || d.userEmail?.includes('ithead'));
    const bsbaHead = dels.find((d) => d.programCode === 'BSBA' || d.userEmail?.includes('businesshead'));

    expect(itHead).toBeDefined();
    expect(bsbaHead).toBeDefined();

    const hasExam = await hasPrivilege(itHead.userId, 'MANAGE_EXAM_SCHEDULE', 'BSIT');
    expect(hasExam).toBe(true);

    const hasExamRevoked = await hasPrivilege(bsbaHead.userId, 'MANAGE_EXAM_SCHEDULE', 'BSBA');
    expect(hasExamRevoked).toBe(false);
  });

  it('3. grants and revokes privileges with audit logging', async () => {
    const dels = await listDelegations();
    const bsbaHead = dels.find((d) => d.programCode === 'BSBA' || d.userEmail?.includes('businesshead'));

    await grantOrRevokePrivileges({
      userId: bsbaHead.userId,
      programCode: 'BSBA',
      privileges: ['MANAGE_EXAM_SCHEDULE', 'MANAGE_CLASS_SCHEDULE'],
      grantedBy: 2,
    });

    const hasExamNow = await hasPrivilege(bsbaHead.userId, 'MANAGE_EXAM_SCHEDULE', 'BSBA');
    expect(hasExamNow).toBe(true);

    // Verify audit logs
    const logsRes = await listSystemLogs({ limit: 10 });
    const logs = logsRes.data || [];
    const delLog = logs.find((l) => l.module === 'Administrative Governance');
    expect(delLog).toBeDefined();
    expect(delLog.action).toContain('Privilege');
  });

  it('4. compiles faculty schedule and dispatches with cubicle advisory note', async () => {
    const payload = await dispatchScheduleToFaculty({
      teacherId: 'T-IT-001',
      recipientEmail: 'adalovelace-it@srcb.edu.ph',
    });

    expect(payload.to).toBe('adalovelace-it@srcb.edu.ph');
    expect(payload.deliveryStatus).toBe('Delivered');
    expect(payload.cubicleAdvisoryNote).toContain('departmental faculty cubicle');

    // Verify system log
    const logsRes = await listSystemLogs({ limit: 10 });
    const logs = logsRes.data || [];
    const mailLog = logs.find((l) => l.module === 'Faculty Schedule Dispatch');
    expect(mailLog).toBeDefined();
    expect(mailLog.action).toBe('Dispatched Schedule to Faculty via Gmail');
  });

  it('5. enforces delegation check in examSchedulesService', async () => {
    const dels = await listDelegations();
    const cjepHead = dels.find((d) => d.programCode === 'BSCRIM' || d.userEmail?.includes('crimhead'));

    const unauthorizedUser = {
      id: cjepHead ? cjepHead.userId : 999,
      role: 'program_head',
      program: 'CJEP',
      programs: ['BSCRIM'],
    };

    // August Vollmer (CJEP) does not have active MANAGE_EXAM_SCHEDULE by default
    await expect(
      examSchedulesService.createExamSchedule(
        {
          term: 'Midterm',
          examDate: '2026-10-15',
          startTime: '08:00',
          endTime: '10:00',
          subjectCode: 'CRIM 101',
          room: 'COL-101',
          program: 'BSCRIM',
        },
        unauthorizedUser
      )
    ).rejects.toThrow(/Exam schedule editing requires Admin authorization/i);
  });
});

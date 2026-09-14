const { query } = require('../utils/db');
const { notificationsService } = require('./notifications.service');
const { schedulesService } = require('./schedules.service');
const { resolveUserProgramScope, isProgramMatch } = require('../utils/programScope');

let inMemoryAdjustmentRequests = [];

async function ensureScheduleAdjustmentRequestsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS schedule_adjustment_requests (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        schedule_id BIGINT UNSIGNED NOT NULL,
        requested_by_user_id BIGINT UNSIGNED NOT NULL,
        requester_name VARCHAR(160) NOT NULL,
        requester_program VARCHAR(50) NOT NULL,
        subject_code VARCHAR(30) NOT NULL,
        subject_name VARCHAR(200) NOT NULL,
        section_name VARCHAR(100) DEFAULT NULL,
        faculty_name VARCHAR(160) DEFAULT NULL,
        room_number VARCHAR(30) DEFAULT NULL,
        current_day VARCHAR(20) NOT NULL,
        current_start_time TIME NOT NULL,
        current_end_time TIME NOT NULL,
        suggested_day VARCHAR(20) DEFAULT NULL,
        suggested_start_time TIME DEFAULT NULL,
        suggested_end_time TIME DEFAULT NULL,
        suggested_room VARCHAR(30) DEFAULT NULL,
        reason TEXT NOT NULL,
        status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
        admin_response TEXT DEFAULT NULL,
        reviewed_by_user_id BIGINT UNSIGNED DEFAULT NULL,
        reviewed_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_adj_req_schedule (schedule_id),
        KEY idx_adj_req_status (status),
        KEY idx_adj_req_user (requested_by_user_id),
        KEY idx_adj_req_program (requester_program)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err) {
    // Graceful fallback for mock DB
  }
}

function normalizeTime(val) {
  if (!val) return null;
  const str = String(val).trim();
  const isPM = /pm/i.test(str);
  const isAM = /am/i.test(str);
  const numbersPart = str.replace(/[^\d:]/g, '');
  const parts = numbersPart.split(':');
  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  const s = parseInt(parts[2], 10) || 0;
  if (isNaN(h)) return null;

  if (isPM) {
    if (h < 12) h += 12;
  } else if (isAM) {
    if (h === 12) h = 0;
  } else if (h >= 1 && h <= 6) {
    h += 12;
  }

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function createAdjustmentRequest(payload, user) {
  await ensureScheduleAdjustmentRequestsTable();

  const userRole = String(user?.role || '').toLowerCase();
  if (userRole === 'teacher') {
    const err = new Error('Teachers are not authorized to submit schedule adjustment requests.');
    err.statusCode = 403;
    err.code = 'UNAUTHORIZED_ROLE';
    throw err;
  }

  if (userRole === 'super_admin') {
    const err = new Error('Super Admin accounts do not manage schedule adjustment requests.');
    err.statusCode = 403;
    err.code = 'UNAUTHORIZED_ROLE';
    throw err;
  }

  const {
    scheduleId,
    schedule_id,
    reason,
    suggestedDay,
    suggested_day,
    suggestedStartTime,
    suggested_start_time,
    suggestedEndTime,
    suggested_end_time,
    suggestedRoom,
    suggested_room,
  } = payload || {};

  const schedId = Number(scheduleId || schedule_id);
  if (!schedId) {
    const err = new Error('Target schedule ID is required.');
    err.statusCode = 400;
    err.code = 'INVALID_PAYLOAD';
    throw err;
  }

  if (!reason || !String(reason).trim()) {
    const err = new Error('Reason for schedule adjustment request is required.');
    err.statusCode = 400;
    err.code = 'INVALID_PAYLOAD';
    throw err;
  }

  // 1. Fetch Target Schedule Details
  let scheduleRow = null;
  try {
    const rows = await query(
      `SELECT sc.id, sc.day, sc.start_time, sc.end_time, sc.subject_code, sc.section_id, sc.faculty_id, sc.room_number,
              sub.name AS subject_name, sub.program_code,
              COALESCE(t.name, '') AS faculty_name,
              sec.course_code, sec.year_level, sec.section_label
       FROM schedules sc
       LEFT JOIN subjects sub ON sc.subject_code = sub.code
       LEFT JOIN teachers t ON sc.faculty_id = t.id
       LEFT JOIN sections sec ON sc.section_id = sec.id
       WHERE sc.id = ?
       LIMIT 1`,
      [schedId]
    );
    if (rows && rows.length > 0) {
      scheduleRow = rows[0];
    }
  } catch (err) {
    // In-memory fallback
  }

  if (!scheduleRow) {
    // Check in-memory schedules list or listSchedules
    try {
      const allSchedules = await schedulesService.listSchedules({ user });
      const found = allSchedules.find((s) => Number(s.id) === schedId || String(s.id) === String(schedId));
      if (found) {
        scheduleRow = {
          id: schedId,
          day: found.day,
          start_time: found.startTime || found.time?.split('-')[0]?.trim() || '08:00:00',
          end_time: found.endTime || found.time?.split('-')[1]?.trim() || '09:30:00',
          subject_code: found.subjectCode,
          subject_name: found.subject || found.subjectCode,
          faculty_name: found.faculty,
          room_number: found.room,
          course_code: found.program,
          year_level: found.yearLevel,
          section_label: found.section,
          program_code: found.program,
        };
      }
    } catch {
      // ignore
    }
  }

  if (!scheduleRow) {
    const err = new Error(`Schedule with ID ${schedId} not found.`);
    err.statusCode = 404;
    err.code = 'SCHEDULE_NOT_FOUND';
    throw err;
  }

  // 2. Prevent Duplicate Pending Requests for the same schedule
  try {
    const existingPending = await query(
      'SELECT id FROM schedule_adjustment_requests WHERE schedule_id = ? AND status = "Pending" LIMIT 1',
      [schedId]
    );
    if (existingPending && existingPending.length > 0) {
      const err = new Error('A pending adjustment request already exists for this schedule.');
      err.statusCode = 409;
      err.code = 'DUPLICATE_PENDING_REQUEST';
      throw err;
    }
  } catch (err) {
    if (err.code === 'DUPLICATE_PENDING_REQUEST') throw err;
    const memExisting = inMemoryAdjustmentRequests.find((r) => Number(r.schedule_id) === schedId && r.status === 'Pending');
    if (memExisting) {
      const err = new Error('A pending adjustment request already exists for this schedule.');
      err.statusCode = 409;
      err.code = 'DUPLICATE_PENDING_REQUEST';
      throw err;
    }
  }

  const requesterId = user?.id || user?.sub || 1;
  const requesterName = user?.name || 'Program Head';
  const requesterProgram = (user?.programCode || user?.program || scheduleRow.program_code || 'ITP').toUpperCase();
  const sectionStr = scheduleRow.section_label
    ? `${scheduleRow.course_code || ''} ${scheduleRow.year_level || ''}-${scheduleRow.section_label}`.trim()
    : (scheduleRow.section_name || '');

  const normCurrentStart = normalizeTime(scheduleRow.start_time) || '08:00:00';
  const normCurrentEnd = normalizeTime(scheduleRow.end_time) || '09:30:00';
  const normSuggStart = normalizeTime(suggestedStartTime || suggested_start_time);
  const normSuggEnd = normalizeTime(suggestedEndTime || suggested_end_time);
  const finalSuggDay = suggestedDay || suggested_day || scheduleRow.day;
  const finalSuggRoom = suggestedRoom || suggested_room || scheduleRow.room_number;

  const newRecord = {
    schedule_id: schedId,
    requested_by_user_id: requesterId,
    requester_name: requesterName,
    requester_program: requesterProgram,
    subject_code: scheduleRow.subject_code,
    subject_name: scheduleRow.subject_name || scheduleRow.subject_code,
    section_name: sectionStr,
    faculty_name: scheduleRow.faculty_name || '',
    room_number: scheduleRow.room_number || '',
    current_day: scheduleRow.day,
    current_start_time: normCurrentStart,
    current_end_time: normCurrentEnd,
    suggested_day: finalSuggDay,
    suggested_start_time: normSuggStart,
    suggested_end_time: normSuggEnd,
    suggested_room: finalSuggRoom,
    reason: String(reason).trim(),
    status: 'Pending',
    admin_response: null,
    reviewed_by_user_id: null,
    reviewed_at: null,
    created_at: new Date().toISOString(),
  };

  let generatedId = null;
  try {
    const res = await query(
      `INSERT INTO schedule_adjustment_requests
       (schedule_id, requested_by_user_id, requester_name, requester_program, subject_code, subject_name,
        section_name, faculty_name, room_number, current_day, current_start_time, current_end_time,
        suggested_day, suggested_start_time, suggested_end_time, suggested_room, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newRecord.schedule_id,
        newRecord.requested_by_user_id,
        newRecord.requester_name,
        newRecord.requester_program,
        newRecord.subject_code,
        newRecord.subject_name,
        newRecord.section_name,
        newRecord.faculty_name,
        newRecord.room_number,
        newRecord.current_day,
        newRecord.current_start_time,
        newRecord.current_end_time,
        newRecord.suggested_day,
        newRecord.suggested_start_time,
        newRecord.suggested_end_time,
        newRecord.suggested_room,
        newRecord.reason,
        newRecord.status,
      ]
    );
    const insertObj = Array.isArray(res) ? res[0] : res;
    generatedId = insertObj?.insertId ? Number(insertObj.insertId) : inMemoryAdjustmentRequests.length + 1;
  } catch (err) {
    generatedId = inMemoryAdjustmentRequests.length + 1;
  }

  newRecord.id = generatedId;
  inMemoryAdjustmentRequests.unshift(newRecord);

  // 3. Dispatch Notification to Admin
  await notificationsService.createNotification({
    title: 'Schedule Adjustment Request',
    message: `Program Head requested a schedule adjustment for ${scheduleRow.subject_code}.`,
    type: 'info',
    link: `/schedules?requestId=${generatedId}`,
    targetRole: 'admin',
    targetProgram: null,
  });

  return formatRequest(newRecord);
}

function formatRequest(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    scheduleId: Number(row.schedule_id),
    requestedByUserId: Number(row.requested_by_user_id),
    requesterName: row.requester_name,
    requesterProgram: row.requester_program,
    subjectCode: row.subject_code,
    subjectName: row.subject_name,
    sectionName: row.section_name,
    facultyName: row.faculty_name,
    roomNumber: row.room_number,
    currentDay: row.current_day,
    currentStartTime: row.current_start_time ? String(row.current_start_time).slice(0, 5) : '',
    currentEndTime: row.current_end_time ? String(row.current_end_time).slice(0, 5) : '',
    suggestedDay: row.suggested_day,
    suggestedStartTime: row.suggested_start_time ? String(row.suggested_start_time).slice(0, 5) : '',
    suggestedEndTime: row.suggested_end_time ? String(row.suggested_end_time).slice(0, 5) : '',
    suggestedRoom: row.suggested_room,
    reason: row.reason,
    status: row.status,
    adminResponse: row.admin_response,
    reviewedByUserId: row.reviewed_by_user_id ? Number(row.reviewed_by_user_id) : null,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

async function listAdjustmentRequests({ user, status, scheduleId } = {}) {
  await ensureScheduleAdjustmentRequestsTable();

  const userRole = String(user?.role || '').toLowerCase();
  if (userRole === 'teacher' || userRole === 'super_admin') {
    return [];
  }

  try {
    let sql = 'SELECT * FROM schedule_adjustment_requests WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (scheduleId) {
      sql += ' AND schedule_id = ?';
      params.push(Number(scheduleId));
    }
    if (userRole === 'program_head') {
      const scope = resolveUserProgramScope(user);
      const userId = user?.id || user?.sub;
      if (scope.allowedProgramCodes.length > 0) {
        const placeholders = scope.allowedProgramCodes.map(() => '?').join(',');
        sql += ` AND (requester_program IN (${placeholders}) OR requested_by_user_id = ?)`;
        params.push(...scope.allowedProgramCodes, userId);
      } else if (userId) {
        sql += ' AND requested_by_user_id = ?';
        params.push(userId);
      }
    }

    sql += ' ORDER BY created_at DESC LIMIT 100';

    const rows = await query(sql, params);
    if (rows && rows.length > 0) {
      return rows.map(formatRequest);
    }
  } catch (err) {
    // Fallback to in-memory store
  }

  let list = [...inMemoryAdjustmentRequests];
  if (status) {
    list = list.filter((r) => r.status.toLowerCase() === status.toLowerCase());
  }
  if (scheduleId) {
    list = list.filter((r) => Number(r.schedule_id) === Number(scheduleId));
  }
  if (userRole === 'program_head') {
    const scope = resolveUserProgramScope(user);
    const userId = user?.id || user?.sub;
    list = list.filter(
      (r) => scope.allowedProgramCodes.some((p) => isProgramMatch(r.requester_program, p)) || (userId && Number(r.requested_by_user_id) === Number(userId))
    );
  }

  return list.map(formatRequest);
}

async function getAdjustmentRequestById(id, user) {
  await ensureScheduleAdjustmentRequestsTable();
  const reqId = Number(id);

  let record = null;
  try {
    const rows = await query('SELECT * FROM schedule_adjustment_requests WHERE id = ? LIMIT 1', [reqId]);
    if (rows && rows.length > 0) {
      record = formatRequest(rows[0]);
    }
  } catch {
    // In-memory fallback
  }

  if (!record) {
    const found = inMemoryAdjustmentRequests.find((r) => Number(r.id) === reqId);
    if (!found) {
      const err = new Error(`Schedule adjustment request with ID ${reqId} not found.`);
      err.statusCode = 404;
      err.code = 'REQUEST_NOT_FOUND';
      throw err;
    }
    record = formatRequest(found);
  }

  if (user && String(user.role).toLowerCase() === 'program_head') {
    const scope = resolveUserProgramScope(user);
    const userId = user?.id || user?.sub;
    const isOwner = userId && Number(record.requestedByUserId) === Number(userId);
    const isProgram = scope.allowedProgramCodes.some((p) => isProgramMatch(record.requesterProgram, p));
    if (!isOwner && !isProgram) {
      const err = new Error('Unauthorized: You cannot access adjustment requests from other academic programs.');
      err.statusCode = 403;
      err.code = 'UNAUTHORIZED_PROGRAM_ACCESS';
      throw err;
    }
  }

  return record;
}

async function approveAdjustmentRequest(id, payload, user) {
  await ensureScheduleAdjustmentRequestsTable();
  const reqId = Number(id);

  const userRole = String(user?.role || '').toLowerCase();
  if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'dsa') {
    const err = new Error('Only Administrators can approve schedule adjustment requests.');
    err.statusCode = 403;
    err.code = 'UNAUTHORIZED_ROLE';
    throw err;
  }

  const reqRow = await getAdjustmentRequestById(reqId, user);
  if (reqRow.status !== 'Pending') {
    const err = new Error(`This request has already been processed with status "${reqRow.status}".`);
    err.statusCode = 400;
    err.code = 'INVALID_REQUEST_STATUS';
    throw err;
  }

  const targetSchedId = reqRow.scheduleId;
  const confirmedDay = payload.day || reqRow.suggestedDay || reqRow.currentDay;
  const confirmedStart = normalizeTime(payload.startTime || payload.start_time || reqRow.suggestedStartTime || reqRow.currentStartTime);
  const confirmedEnd = normalizeTime(payload.endTime || payload.end_time || reqRow.suggestedEndTime || reqRow.currentEndTime);
  const confirmedRoom = payload.room || payload.room_number || reqRow.suggestedRoom || reqRow.roomNumber;
  const adminResponse = payload.adminResponse || payload.admin_response || payload.reason || 'Approved schedule adjustment.';

  if (!confirmedDay || !confirmedStart || !confirmedEnd) {
    const err = new Error('Confirmed day, start time, and end time are required to approve the request.');
    err.statusCode = 400;
    err.code = 'INVALID_PAYLOAD';
    throw err;
  }

  // 1. Validate schedule conflicts & rules via schedulesService
  const updatedSchedule = await schedulesService.updateSchedule(
    targetSchedId,
    {
      day: confirmedDay,
      time: `${confirmedStart.slice(0, 5)}-${confirmedEnd.slice(0, 5)}`,
      start_time: confirmedStart,
      end_time: confirmedEnd,
      room_number: confirmedRoom,
      room: confirmedRoom,
      subjectCode: reqRow.subjectCode,
    },
    user
  );

  // 2. Mark request as Approved
  const reviewerId = user?.id || user?.sub || 1;
  const nowIso = new Date().toISOString();

  try {
    await query(
      `UPDATE schedule_adjustment_requests
       SET status = 'Approved', admin_response = ?, reviewed_by_user_id = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [adminResponse, reviewerId, reqId]
    );
  } catch {
    // In-memory fallback
  }

  const memReq = inMemoryAdjustmentRequests.find((r) => Number(r.id) === reqId);
  if (memReq) {
    memReq.status = 'Approved';
    memReq.admin_response = adminResponse;
    memReq.reviewed_by_user_id = reviewerId;
    memReq.reviewed_at = nowIso;
  }

  // 3. Notify Program Head
  await notificationsService.createNotification({
    title: 'Schedule Adjustment Approved',
    message: `Admin approved schedule adjustment for ${reqRow.subjectCode}.`,
    type: 'success',
    link: '/schedules',
    targetUserId: reqRow.requestedByUserId,
    targetRole: 'program_head',
    targetProgram: reqRow.requesterProgram,
  });

  return {
    success: true,
    request: {
      ...reqRow,
      status: 'Approved',
      adminResponse,
      reviewedByUserId: reviewerId,
      reviewedAt: nowIso,
    },
    schedule: updatedSchedule,
  };
}

async function rejectAdjustmentRequest(id, payload, user) {
  await ensureScheduleAdjustmentRequestsTable();
  const reqId = Number(id);

  const userRole = String(user?.role || '').toLowerCase();
  if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'dsa') {
    const err = new Error('Only Administrators can reject schedule adjustment requests.');
    err.statusCode = 403;
    err.code = 'UNAUTHORIZED_ROLE';
    throw err;
  }

  const reqRow = await getAdjustmentRequestById(reqId, user);
  if (reqRow.status !== 'Pending') {
    const err = new Error(`This request has already been processed with status "${reqRow.status}".`);
    err.statusCode = 400;
    err.code = 'INVALID_REQUEST_STATUS';
    throw err;
  }

  const adminResponse = payload.adminResponse || payload.admin_response || payload.reason || 'Schedule adjustment request declined.';
  const reviewerId = user?.id || user?.sub || 1;
  const nowIso = new Date().toISOString();

  try {
    await query(
      `UPDATE schedule_adjustment_requests
       SET status = 'Rejected', admin_response = ?, reviewed_by_user_id = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [adminResponse, reviewerId, reqId]
    );
  } catch {
    // In-memory fallback
  }

  const memReq = inMemoryAdjustmentRequests.find((r) => Number(r.id) === reqId);
  if (memReq) {
    memReq.status = 'Rejected';
    memReq.admin_response = adminResponse;
    memReq.reviewed_by_user_id = reviewerId;
    memReq.reviewed_at = nowIso;
  }

  // Notify Program Head with rejection reason
  await notificationsService.createNotification({
    title: 'Schedule Adjustment Rejected',
    message: `Admin rejected schedule adjustment for ${reqRow.subjectCode}: ${adminResponse}`,
    type: 'warning',
    link: '/schedules',
    targetUserId: reqRow.requestedByUserId,
    targetRole: 'program_head',
    targetProgram: reqRow.requesterProgram,
  });

  return {
    success: true,
    request: {
      ...reqRow,
      status: 'Rejected',
      adminResponse,
      reviewedByUserId: reviewerId,
      reviewedAt: nowIso,
    },
  };
}

module.exports = {
  scheduleAdjustmentRequestsService: {
    createAdjustmentRequest,
    listAdjustmentRequests,
    getAdjustmentRequestById,
    approveAdjustmentRequest,
    rejectAdjustmentRequest,
    ensureScheduleAdjustmentRequestsTable,
  },
};

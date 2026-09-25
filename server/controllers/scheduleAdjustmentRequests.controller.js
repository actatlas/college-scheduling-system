const { scheduleAdjustmentRequestsService } = require('../services/scheduleAdjustmentRequests.service');
const { logAction } = require('../services/systemLogs.service');

async function createRequest(req, res, next) {
  try {
    const data = await scheduleAdjustmentRequestsService.createAdjustmentRequest(req.body, req.user);

    await logAction({
      req,
      user: req.user,
      module: 'Class Scheduling',
      action: 'Submitted Permission Request',
      description: `Program Head ${req.user?.name || ''} submitted ${data.requestedAction || 'permission'} request for ${data.subjectCode || data.subject_code} (${data.requesterProgram || data.requester_program}).`,
      targetId: data.id,
      targetType: 'ScheduleAdjustmentRequest',
      status: 'Success',
      details: { scheduleId: data.scheduleId || data.schedule_id, action: data.requestedAction, reason: data.reason },
    });

    res.status(201).json({ data });
  } catch (err) {
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code || 'VALIDATION_ERROR' });
    }
    next(err);
  }
}

async function listRequests(req, res, next) {
  try {
    const data = await scheduleAdjustmentRequestsService.listAdjustmentRequests({
      user: req.user,
      status: req.query.status,
      scheduleId: req.query.scheduleId || req.query.schedule_id,
      action: req.query.action || req.query.requestedAction || req.query.requested_action,
      program: req.query.program || req.query.programCode || req.query.program_code,
    });
    res.json({ data });
  } catch (err) {
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code || 'VALIDATION_ERROR' });
    }
    next(err);
  }
}

async function getRequestById(req, res, next) {
  try {
    const data = await scheduleAdjustmentRequestsService.getAdjustmentRequestById(req.params.id, req.user);
    res.json({ data });
  } catch (err) {
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code || 'VALIDATION_ERROR' });
    }
    next(err);
  }
}

async function approveRequest(req, res, next) {
  try {
    const result = await scheduleAdjustmentRequestsService.approveAdjustmentRequest(req.params.id, req.body, req.user);

    await logAction({
      req,
      user: req.user,
      module: 'Class Scheduling',
      action: 'Approved Permission Request',
      description: `Administrator ${req.user?.name || ''} approved permission request #${req.params.id} for ${result.request?.subjectCode || result.request?.subject_code} (${result.request?.requesterProgram || result.request?.requester_program}).`,
      targetId: req.params.id,
      targetType: 'ScheduleAdjustmentRequest',
      status: 'Success',
      details: { adminRemarks: req.body?.adminRemarks || req.body?.admin_response, request: result.request },
    });

    res.json(result);
  } catch (err) {
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code || 'VALIDATION_ERROR' });
    }
    next(err);
  }
}

async function rejectRequest(req, res, next) {
  try {
    const result = await scheduleAdjustmentRequestsService.rejectAdjustmentRequest(req.params.id, req.body, req.user);

    await logAction({
      req,
      user: req.user,
      module: 'Class Scheduling',
      action: 'Rejected Permission Request',
      description: `Administrator ${req.user?.name || ''} rejected permission request #${req.params.id} for ${result.request?.subjectCode || result.request?.subject_code}.`,
      targetId: req.params.id,
      targetType: 'ScheduleAdjustmentRequest',
      status: 'Success',
      details: { adminRemarks: req.body?.adminRemarks || req.body?.admin_response, request: result.request },
    });

    res.json(result);
  } catch (err) {
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code || 'VALIDATION_ERROR' });
    }
    next(err);
  }
}

module.exports = {
  createRequest,
  listRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
};

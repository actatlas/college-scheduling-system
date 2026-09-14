const { scheduleAdjustmentRequestsService } = require('../services/scheduleAdjustmentRequests.service');
const { logAction } = require('../services/systemLogs.service');

async function createRequest(req, res, next) {
  try {
    const data = await scheduleAdjustmentRequestsService.createAdjustmentRequest(req.body, req.user);

    await logAction({
      req,
      user: req.user,
      module: 'Class Scheduling',
      action: 'Submitted Schedule Adjustment Request',
      description: `Program Head ${req.user.name || ''} submitted schedule adjustment request for ${data.subject_code} (${data.current_day} -> ${data.suggested_day || data.current_day}).`,
      targetId: data.id,
      targetType: 'ScheduleAdjustmentRequest',
      status: 'Success',
      details: { scheduleId: data.schedule_id, reason: data.reason },
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
      action: 'Approved Schedule Adjustment Request',
      description: `Administrator ${req.user.name || ''} approved schedule adjustment request #${req.params.id}.`,
      targetId: req.params.id,
      targetType: 'ScheduleAdjustmentRequest',
      status: 'Success',
      details: { adminResponse: req.body?.admin_response },
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
      action: 'Rejected Schedule Adjustment Request',
      description: `Administrator ${req.user.name || ''} rejected schedule adjustment request #${req.params.id}.`,
      targetId: req.params.id,
      targetType: 'ScheduleAdjustmentRequest',
      status: 'Success',
      details: { adminResponse: req.body?.admin_response },
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

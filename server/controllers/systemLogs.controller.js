const { listSystemLogs, getFilterOptions, getSystemLogById } = require('../services/systemLogs.service');

async function listLogs(req, res, next) {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Forbidden. System Logs is an exclusive ICT Super Administrator feature.',
        code: 'UNAUTHORIZED_ROLE',
      });
    }

    const {
      search,
      userId,
      role,
      module,
      action,
      status,
      startDate,
      endDate,
      page,
      limit,
    } = req.query;

    const result = await listSystemLogs({
      search,
      userId,
      role,
      module,
      action,
      status,
      startDate,
      endDate,
      page,
      limit,
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function getFilters(req, res, next) {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Forbidden. System Logs is an exclusive ICT Super Administrator feature.',
        code: 'UNAUTHORIZED_ROLE',
      });
    }

    const filters = await getFilterOptions();
    return res.json({ data: filters });
  } catch (err) {
    return next(err);
  }
}

async function getLogDetails(req, res, next) {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Forbidden. System Logs is an exclusive ICT Super Administrator feature.',
        code: 'UNAUTHORIZED_ROLE',
      });
    }

    const { id } = req.params;
    const log = await getSystemLogById(id);
    if (!log) {
      return res.status(404).json({ error: 'System log record not found' });
    }

    return res.json({ data: log });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listLogs,
  getFilters,
  getLogDetails,
};

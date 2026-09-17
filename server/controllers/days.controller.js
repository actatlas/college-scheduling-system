const { daysService } = require('../services/days.service');

async function listDays(req, res, next) {
  try {
    const rows = await daysService.listDays();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { listDays };

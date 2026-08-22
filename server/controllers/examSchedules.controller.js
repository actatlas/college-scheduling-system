const { examSchedulesService } = require('../services/examSchedules.service');

async function listExamSchedules(req, res, next) {
  try {
    const data = await examSchedulesService.listExamSchedules();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function createExamSchedule(req, res, next) {
  try {
    const data = await examSchedulesService.createExamSchedule(req.body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

async function updateExamSchedule(req, res, next) {
  try {
    const data = await examSchedulesService.updateExamSchedule(req.params.id, req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function deleteExamSchedule(req, res, next) {
  try {
    await examSchedulesService.deleteExamSchedule(req.params.id);
    res.json({ message: 'Exam schedule deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listExamSchedules,
  createExamSchedule,
  updateExamSchedule,
  deleteExamSchedule,
};

const { departmentsService } = require('../services/departments.service');

async function listDepartments(req, res, next) {
  try {
    const rows = await departmentsService.listDepartments();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function createDepartment(req, res, next) {
  try {
    const payload = req.body || {};
    const row = await departmentsService.createDepartment(payload);
    res.status(201).json({ data: row });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Department already exists' });
    }
    next(err);
  }
}

module.exports = { listDepartments, createDepartment };

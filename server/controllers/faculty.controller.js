const { facultyService } = require('../services/faculty.service');

async function listFaculty(req, res, next) {
  try {
    const rows = await facultyService.listFaculty();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function createFaculty(req, res, next) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const payload = req.body || {};
    const row = await facultyService.createFaculty(payload);
    res.status(201).json({ data: row });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Faculty id already exists' });
    }
    next(err);
  }
}

async function updateFaculty(req, res, next) {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    if (req.user?.role !== 'admin') {
      const teacherId = req.user?.teacher?.id;
      const allowedKeys = ['availability'];
      const invalidUpdate = Object.keys(payload).some(
        (key) => !allowedKeys.includes(key),
      );
      if (!teacherId || teacherId !== id || invalidUpdate) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const row = await facultyService.updateFaculty(id, payload);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

module.exports = { listFaculty, createFaculty, updateFaculty };


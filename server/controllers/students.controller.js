const { studentsService } = require('../services/students.service');

async function listStudents(req, res, next) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const rows = await studentsService.listStudents();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function createStudent(req, res, next) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const payload = req.body || {};
    const row = await studentsService.createStudent(payload);
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
}

async function updateStudent(req, res, next) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    const payload = req.body || {};
    const row = await studentsService.updateStudent(id, payload);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

async function deleteStudent(req, res, next) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    await studentsService.deleteStudent(id);
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
};

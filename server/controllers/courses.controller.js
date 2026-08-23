const { coursesService } = require('../services/courses.service');

async function listCourses(req, res, next) {
  try {
    const rows = await coursesService.listCourses();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function createCourse(req, res, next) {
  try {
    const payload = req.body || {};
    const row = await coursesService.createCourse(payload);
    res.status(201).json({ data: row });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Course code already exists' });
    }
    next(err);
  }
}

async function updateCourse(req, res, next) {
  try {
    const code = req.params.code;
    const payload = req.body || {};
    const row = await coursesService.updateCourse(code, payload);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

async function deleteCourse(req, res, next) {
  try {
    const code = req.params.code;
    await coursesService.deleteCourse(code);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listCourses, createCourse, updateCourse, deleteCourse };



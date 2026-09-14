const { coursesService } = require('../services/courses.service');
const { logAction } = require('../services/systemLogs.service');

async function listCourses(req, res, next) {
  try {
    const rows = await coursesService.listCourses(req.user);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function createCourse(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can create courses.', code: 'UNAUTHORIZED_ROLE' });
    }
    const payload = req.body || {};
    const row = await coursesService.createCourse(payload);

    await logAction({
      req,
      user: req.user,
      module: 'Academic Management',
      action: 'Created Course',
      description: `Created course ${row.name || row.code} (${row.code}).`,
      targetId: row.code,
      targetType: 'Course',
      status: 'Success',
    });

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
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can update courses.', code: 'UNAUTHORIZED_ROLE' });
    }
    const code = req.params.code;
    const payload = req.body || {};
    const row = await coursesService.updateCourse(code, payload);

    await logAction({
      req,
      user: req.user,
      module: 'Academic Management',
      action: 'Updated Course',
      description: `Updated course ${code}.`,
      targetId: code,
      targetType: 'Course',
      status: 'Success',
    });

    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

async function deleteCourse(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can delete courses.', code: 'UNAUTHORIZED_ROLE' });
    }
    const code = req.params.code;
    await coursesService.deleteCourse(code);

    await logAction({
      req,
      user: req.user,
      module: 'Academic Management',
      action: 'Deleted Course',
      description: `Deleted course ${code}.`,
      targetId: code,
      targetType: 'Course',
      status: 'Success',
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listCourses, createCourse, updateCourse, deleteCourse };



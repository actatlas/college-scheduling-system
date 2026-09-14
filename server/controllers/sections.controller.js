const { sectionsService } = require('../services/sections.service');
const { logAction } = require('../services/systemLogs.service');

async function listSections(req, res, next) {
  try {
    const rows = await sectionsService.listSections(req.user);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function createSection(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can create sections.', code: 'UNAUTHORIZED_ROLE' });
    }
    const payload = req.body || {};
    const row = await sectionsService.createSection(payload);

    await logAction({
      req,
      user: req.user,
      module: 'Academic Management',
      action: 'Created Class Section',
      description: `Created class section ${row.name || row.section_label || 'Section'} for course ${row.course_code || ''}.`,
      targetId: row.id,
      targetType: 'Section',
      status: 'Success',
      details: { courseCode: row.course_code, yearLevel: row.year_level, label: row.section_label },
    });

    res.status(201).json({ data: row });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Section already exists' });
    }
    next(err);
  }
}

async function updateSection(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can update sections.', code: 'UNAUTHORIZED_ROLE' });
    }
    const { id } = req.params;
    const payload = req.body || {};
    const row = await sectionsService.updateSection(id, payload);

    await logAction({
      req,
      user: req.user,
      module: 'Academic Management',
      action: 'Updated Class Section',
      description: `Updated class section #${id}.`,
      targetId: id,
      targetType: 'Section',
      status: 'Success',
    });

    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

async function deleteSection(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can delete sections.', code: 'UNAUTHORIZED_ROLE' });
    }
    const { id } = req.params;
    await sectionsService.deleteSection(id);

    await logAction({
      req,
      user: req.user,
      module: 'Academic Management',
      action: 'Deleted Class Section',
      description: `Deleted class section #${id}.`,
      targetId: id,
      targetType: 'Section',
      status: 'Success',
    });

    res.json({ message: 'Section deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listSections, createSection, updateSection, deleteSection };


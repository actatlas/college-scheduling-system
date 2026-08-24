const { sectionsService } = require('../services/sections.service');

async function listSections(req, res, next) {
  try {
    const rows = await sectionsService.listSections();
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
    res.json({ message: 'Section deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listSections, createSection, updateSection, deleteSection };


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

module.exports = { listSections, createSection };


const { programsService } = require('../services/programs.service');

async function listPrograms(req, res, next) {
  try {
    const rows = await programsService.listPrograms();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function createProgram(req, res, next) {
  try {
    const payload = req.body || {};
    const row = await programsService.createProgram(payload);
    res.status(201).json({ data: row });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Program already exists' });
    }
    next(err);
  }
}

module.exports = { listPrograms, createProgram };

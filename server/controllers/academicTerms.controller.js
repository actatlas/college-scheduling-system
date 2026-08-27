const { academicTermsService } = require('../services/academicTerms.service');

async function getTerms(req, res, next) {
  try {
    const [years, semesters, activeTerm] = await Promise.all([
      academicTermsService.listAcademicYears(),
      academicTermsService.listSemesters(),
      academicTermsService.getActiveTerm(),
    ]);
    res.json({
      data: {
        academicYears: years,
        semesters,
        activeTerm,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function createAcademicYear(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can create academic years.', code: 'UNAUTHORIZED_ROLE' });
    }
    const row = await academicTermsService.createAcademicYear(req.body || {});
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
}

async function activateAcademicYear(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can set active academic year.', code: 'UNAUTHORIZED_ROLE' });
    }
    const id = req.params.id;
    const rows = await academicTermsService.setActiveAcademicYear(id);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function createSemester(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can create semesters.', code: 'UNAUTHORIZED_ROLE' });
    }
    const row = await academicTermsService.createSemester(req.body || {});
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
}

async function activateSemester(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can set active semester.', code: 'UNAUTHORIZED_ROLE' });
    }
    const id = req.params.id;
    const rows = await academicTermsService.setActiveSemester(id);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function getSettings(req, res, next) {
  try {
    const settings = await academicTermsService.getSystemSettings();
    res.json({ data: settings });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can update system settings.', code: 'UNAUTHORIZED_ROLE' });
    }
    const updated = await academicTermsService.updateSystemSettings(req.body || {});
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTerms,
  createAcademicYear,
  activateAcademicYear,
  createSemester,
  activateSemester,
  getSettings,
  updateSettings,
};

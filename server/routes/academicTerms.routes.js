const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const controller = require('../controllers/academicTerms.controller');

const router = express.Router();
router.use(authMiddleware);

router.get('/', controller.getTerms);
router.post('/years', controller.createAcademicYear);
router.put('/years/:id/activate', controller.activateAcademicYear);
router.post('/semesters', controller.createSemester);
router.put('/semesters/:id/activate', controller.activateSemester);

// System settings
router.get('/settings', controller.getSettings);
router.put('/settings', controller.updateSettings);

module.exports = router;

const express = require('express');

const authRoutes = require('./auth.routes');
const facultyRoutes = require('./faculty.routes');
const subjectRoutes = require('./subjects.routes');
const courseRoutes = require('./courses.routes');
const sectionRoutes = require('./sections.routes');
const roomRoutes = require('./rooms.routes');
const scheduleRoutes = require('./schedules.routes');
const programsRoutes = require('./programs.routes');
const programMajorsRoutes = require('./programMajors.routes');
const yearLevelsRoutes = require('./yearLevels.routes');
const userRoutes = require('./users.routes');

const buildingsRoutes = require('./buildings.routes');
const facultyAvailabilityRoutes = require('./facultyAvailability.routes');
const examSchedulesRoutes = require('./examSchedules.routes');
const conflictsRoutes = require('./conflicts.routes');
const reportsRoutes = require('./reports.routes');
const academicTermsRoutes = require('./academicTerms.routes');
const notificationsRoutes = require('./notifications.routes');
const scheduleAdjustmentRequestsRoutes = require('./scheduleAdjustmentRequests.routes');
const systemLogsRoutes = require('./systemLogs.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/faculty', facultyRoutes);
router.use('/faculty-availability', facultyAvailabilityRoutes);
router.use('/subjects', subjectRoutes);
router.use('/courses', courseRoutes);
router.use('/sections', sectionRoutes);
router.use('/buildings', buildingsRoutes);
router.use('/rooms', roomRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/schedule-adjustment-requests', scheduleAdjustmentRequestsRoutes);
router.use('/exam-schedules', examSchedulesRoutes);
router.use('/exams', examSchedulesRoutes);
router.use('/conflicts', conflictsRoutes);
router.use('/reports', reportsRoutes);
router.use('/programs', programsRoutes);
router.use('/program-majors', programMajorsRoutes);
router.use('/year-levels', yearLevelsRoutes);
router.use('/users', userRoutes);
router.use('/terms', academicTermsRoutes);
router.use('/system-settings', academicTermsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/system-logs', systemLogsRoutes);
router.use('/audit-logs', systemLogsRoutes);

module.exports = router;



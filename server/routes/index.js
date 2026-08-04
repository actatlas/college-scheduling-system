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

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/faculty', facultyRoutes);
router.use('/subjects', subjectRoutes);
router.use('/courses', courseRoutes);
router.use('/sections', sectionRoutes);
router.use('/rooms', roomRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/programs', programsRoutes);
router.use('/program-majors', programMajorsRoutes);
router.use('/year-levels', yearLevelsRoutes);
router.use('/users', userRoutes);


module.exports = router;


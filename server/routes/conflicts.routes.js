const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { listConflicts } = require('../controllers/schedules.controller');

const router = express.Router();
router.use(authMiddleware);
router.get('/', listConflicts);

module.exports = router;


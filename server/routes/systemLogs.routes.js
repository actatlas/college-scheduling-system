const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { listLogs, getFilters, getLogDetails } = require('../controllers/systemLogs.controller');

const router = express.Router();

// Strict Super Admin protection on all system log routes
router.use(authMiddleware);

router.get('/', listLogs);
router.get('/filters', getFilters);
router.get('/:id', getLogDetails);

module.exports = router;

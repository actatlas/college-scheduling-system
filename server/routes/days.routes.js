const express = require('express');
const daysController = require('../controllers/days.controller');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/', daysController.listDays);

module.exports = router;

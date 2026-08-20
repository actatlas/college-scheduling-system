const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.json({ message: 'Exam Schedules API' }));

module.exports = router;

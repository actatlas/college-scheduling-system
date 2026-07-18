const express = require('express');
const { listPrograms, createProgram } = require('../controllers/programs.controller');

const router = express.Router();

router.get('/', listPrograms);
router.post('/', createProgram);

module.exports = router;

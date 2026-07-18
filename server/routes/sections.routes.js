const express = require('express');
const { listSections, createSection } = require('../controllers/sections.controller');

const router = express.Router();
router.get('/', listSections);
router.post('/', createSection);

module.exports = router;


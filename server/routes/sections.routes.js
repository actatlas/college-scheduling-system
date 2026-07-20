const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { listSections, createSection, updateSection, deleteSection } = require('../controllers/sections.controller');

const router = express.Router();
router.use(authMiddleware);
router.get('/', listSections);
router.post('/', createSection);
router.put('/:id', updateSection);
router.delete('/:id', deleteSection);

module.exports = router;


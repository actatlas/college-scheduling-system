const express = require('express');
const { listDepartments, createDepartment } = require('../controllers/departments.controller');

const router = express.Router();

router.get('/', listDepartments);
router.post('/', createDepartment);

module.exports = router;

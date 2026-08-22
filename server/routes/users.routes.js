const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { listUsers, createUser, updateUser, deleteUser } = require('../controllers/users.controller');

const router = express.Router();
router.use(authMiddleware);
router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;


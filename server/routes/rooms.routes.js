const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { listRooms, createRoom, updateRoom, deleteRoom } = require('../controllers/rooms.controller');

const router = express.Router();
router.use(authMiddleware);

router.get('/', listRooms);
router.post('/', createRoom);
router.delete('/:number', deleteRoom);
router.put('/:number', updateRoom);

module.exports = router;


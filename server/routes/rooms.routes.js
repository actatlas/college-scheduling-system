const express = require('express');
const { listRooms, createRoom } = require('../controllers/rooms.controller');

const router = express.Router();
router.get('/', listRooms);
router.post('/', createRoom);
router.delete('/:number', require('../controllers/rooms.controller').deleteRoom);
router.put('/:number', require('../controllers/rooms.controller').updateRoom);

module.exports = router;


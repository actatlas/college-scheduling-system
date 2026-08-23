const { roomsService } = require('../services/rooms.service');

async function listRooms(req, res, next) {
  try {
    const rows = await roomsService.listRooms();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function createRoom(req, res, next) {
  try {
    const payload = req.body || {};
    if (!payload.number) {
      return res.status(400).json({ error: 'room number is required' });
    }
    const row = await roomsService.createRoom(payload);
    res.status(201).json({ data: row });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Room number already exists' });
    }
    next(err);
  }
}

async function deleteRoom(req, res, next) {
  try {
    const number = req.params.number;
    await roomsService.deleteRoom(number);
    res.status(204).end();
  } catch (err) {
    if (err && (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451)) {
      return res.status(409).json({
        error: 'Cannot delete room because it is currently assigned to class or exam schedules.',
        code: 'ACADEMIC_DEPENDENCY_RESTRICT'
      });
    }
    next(err);
  }
}

async function updateRoom(req, res, next) {
  try {
    const number = req.params.number;
    const payload = req.body || {};
    const row = await roomsService.updateRoom(number, payload);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

module.exports = { listRooms, createRoom, deleteRoom, updateRoom };


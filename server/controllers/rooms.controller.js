const { roomsService } = require('../services/rooms.service');
const { logAction } = require('../services/systemLogs.service');

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
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can create rooms.', code: 'UNAUTHORIZED_ROLE' });
    }
    const payload = req.body || {};
    if (!payload.number) {
      return res.status(400).json({ error: 'room number is required' });
    }
    const row = await roomsService.createRoom(payload);

    await logAction({
      req,
      user: req.user,
      module: 'Room Management',
      action: 'Created Room',
      description: `Created campus room ${row.number} in ${row.building || 'Campus'} (capacity: ${row.capacity || 0}).`,
      targetId: row.number,
      targetType: 'Room',
      status: 'Success',
      details: { number: row.number, building: row.building, capacity: row.capacity, type: row.type },
    });

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
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can delete rooms.', code: 'UNAUTHORIZED_ROLE' });
    }
    const number = req.params.number;
    await roomsService.deleteRoom(number);

    await logAction({
      req,
      user: req.user,
      module: 'Room Management',
      action: 'Deleted Room',
      description: `Deleted campus room ${number}.`,
      targetId: number,
      targetType: 'Room',
      status: 'Success',
    });

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
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. Only Administrators can update rooms.', code: 'UNAUTHORIZED_ROLE' });
    }
    const number = req.params.number;
    const payload = req.body || {};
    const row = await roomsService.updateRoom(number, payload);

    await logAction({
      req,
      user: req.user,
      module: 'Room Management',
      action: 'Updated Room',
      description: `Updated campus room ${number}.`,
      targetId: number,
      targetType: 'Room',
      status: 'Success',
      details: { building: row.building, capacity: row.capacity, status: row.status },
    });

    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

module.exports = { listRooms, createRoom, deleteRoom, updateRoom };


const { query } = require('../utils/db');

async function listRooms() {
  // Frontend RoomItem expects:
  // { number, capacity, building, type, status }
  const rows = await query(
    `SELECT number, capacity, building, type, status
     FROM rooms
     ORDER BY number ASC`
  );

  return rows.map((r) => ({
    number: r.number,
    capacity: Number(r.capacity),
    building: r.building,
    type: r.type,
    status: r.status,
  }));
}

async function createRoom({ number, capacity, building, type, status }) {
  await query(
    'INSERT INTO rooms (number, capacity, building, type, status) VALUES (?, ?, ?, ?, ?)',
    [number, capacity, building, type, status]
  );
  return { number, capacity, building, type, status };
}

const roomsService = { listRooms, createRoom };
module.exports = { roomsService };

async function deleteRoom(number) {
  await query('DELETE FROM rooms WHERE number = ?', [number]);
}

async function updateRoom(number, { capacity, building, type, status }) {
  await query('UPDATE rooms SET capacity = ?, building = ?, type = ?, status = ? WHERE number = ?', [capacity || 0, building || '', type || '', status || 'active', number]);
  return { number, capacity, building, type, status };
}

roomsService.updateRoom = updateRoom;

roomsService.deleteRoom = deleteRoom;


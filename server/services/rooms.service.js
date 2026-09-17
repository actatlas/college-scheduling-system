const { query } = require('../utils/db');

async function listRooms() {
  let rows = [];
  try {
    rows = await query(
      `SELECT number, COALESCE(room_name, number) AS room_name, capacity, type, status
       FROM rooms
       ORDER BY number ASC`
    );
  } catch (e) {
    rows = await query(
      `SELECT number, capacity, type, status
       FROM rooms
       ORDER BY number ASC`
    );
  }

  return rows.map((r) => ({
    number: r.number,
    code: r.number,
    roomName: r.room_name || r.number,
    capacity: Number(r.capacity),
    building: '',
    type: r.type,
    status: r.status,
  }));
}

async function createRoom({ number, capacity, type, status, roomName }) {
  const rName = roomName || number;
  try {
    await query(
      'INSERT INTO rooms (number, room_name, capacity, type, status) VALUES (?, ?, ?, ?, ?)',
      [number, rName, capacity, type, status || 'active']
    );
  } catch (e) {
    await query(
      'INSERT INTO rooms (number, capacity, type, status) VALUES (?, ?, ?, ?)',
      [number, capacity, type, status || 'active']
    );
  }
  return { number, code: number, roomName: rName, capacity, type, status: status || 'active' };
}

async function updateRoom(number, { capacity, type, status, roomName }) {
  const rName = roomName || number;
  try {
    await query(
      'UPDATE rooms SET capacity = ?, room_name = ?, type = ?, status = ? WHERE number = ?',
      [capacity || 0, rName, type || 'Lecture', status || 'active', number]
    );
  } catch (e) {
    await query(
      'UPDATE rooms SET capacity = ?, type = ?, status = ? WHERE number = ?',
      [capacity || 0, type || 'Lecture', status || 'active', number]
    );
  }
  return { number, code: number, roomName: rName, capacity, type, status: status || 'active' };
}

async function deleteRoom(number) {
  await query('DELETE FROM rooms WHERE number = ?', [number]);
}

const roomsService = { listRooms, createRoom, updateRoom, deleteRoom };
module.exports = { roomsService };

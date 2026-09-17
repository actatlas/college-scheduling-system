const { query } = require('../utils/db');

async function listDays() {
  const rows = await query('SELECT id, name FROM days ORDER BY id ASC');
  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
  }));
}

const daysService = { listDays };
module.exports = { daysService };

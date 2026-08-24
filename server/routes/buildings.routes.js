const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { query } = require('../utils/db');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT building, COUNT(*) AS room_count, SUM(capacity) AS total_capacity
       FROM rooms
       GROUP BY building
       ORDER BY building ASC`
    );
    const defaults = [
      { name: 'College Building', code: 'COL' },
      { name: 'SHS Building', code: 'SHS' },
      { name: 'JHS Building', code: 'JHS' },
    ];
    const data = defaults.map((d) => {
      const found = rows.find((r) => r.building && r.building.toLowerCase() === d.name.toLowerCase());
      return {
        name: d.name,
        code: d.code,
        roomCount: found ? Number(found.room_count) : 0,
        totalCapacity: found ? Number(found.total_capacity) : 0,
      };
    });

    for (const r of rows) {
      if (!defaults.some((d) => d.name.toLowerCase() === (r.building || '').toLowerCase())) {
        data.push({
          name: r.building,
          code: (r.building || '').slice(0, 3).toUpperCase(),
          roomCount: Number(r.room_count),
          totalCapacity: Number(r.total_capacity),
        });
      }
    }

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


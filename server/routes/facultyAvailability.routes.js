const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { query } = require('../utils/db');

const router = express.Router();
router.use(authMiddleware);

router.get('/:teacherId?', async (req, res, next) => {
  try {
    let teacherId = req.params.teacherId;
    if (!teacherId && req.user?.role === 'teacher') {
      teacherId = req.user.teacherId;
      if (!teacherId && req.user.email) {
        const [t] = await query('SELECT id FROM teachers WHERE email = ? LIMIT 1', [req.user.email]);
        if (t) teacherId = t.id;
      }
    }

    if (!teacherId) {
      const allRows = await query(
        `SELECT ta.id, ta.teacher_id, ta.day_of_week, ta.start_time, ta.end_time, t.name AS teacher_name
         FROM teacher_availability ta
         LEFT JOIN teachers t ON t.id = ta.teacher_id
         ORDER BY ta.teacher_id ASC, ta.day_of_week ASC`
      );
      return res.json({ data: allRows });
    }

    const rows = await query(
      `SELECT id, teacher_id, day_of_week, start_time, end_time
       FROM teacher_availability
       WHERE teacher_id = ?
       ORDER BY day_of_week ASC, start_time ASC`,
      [teacherId]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

function formatTo24HourTime(timeStr) {
  if (!timeStr) return null;
  const parts = String(timeStr).trim().split(':');
  let h = Number(parts[0]) || 0;
  const m = String(parts[1] || '00').padStart(2, '0').slice(0, 2);
  if (h >= 1 && h <= 7) h += 12;
  return `${String(h).padStart(2, '0')}:${m}:00`;
}

router.put('/:teacherId', async (req, res, next) => {
  try {
    let teacherId = req.params.teacherId;
    const userRole = req.user?.role;

    if (!['admin', 'super_admin', 'program_head'].includes(userRole)) {
      if (userRole !== 'teacher') {
        return res.status(403).json({ error: 'Forbidden', code: 'UNAUTHORIZED_ROLE' });
      }

      let teacherRow = null;
      if (req.user?.teacherId) {
        const [row] = await query('SELECT id, name, email, status FROM teachers WHERE id = ? LIMIT 1', [req.user.teacherId]);
        if (row) teacherRow = row;
      }
      if (!teacherRow && req.user?.email) {
        const [row] = await query('SELECT id, name, email, status FROM teachers WHERE LOWER(email) = LOWER(?) LIMIT 1', [req.user.email]);
        if (row) teacherRow = row;
      }
      if (!teacherRow && teacherId) {
        const [row] = await query('SELECT id, name, email, status FROM teachers WHERE id = ? LIMIT 1', [teacherId]);
        if (row && (!row.email || (req.user?.email && row.email.toLowerCase() === req.user.email.toLowerCase()))) {
          teacherRow = row;
        }
      }

      const teacherStatus = teacherRow?.status || req.user?.teacher?.status || 'Part-Time';

      if (teacherStatus === 'Full-Time') {
        return res.status(403).json({
          error: 'Full-time faculty cannot configure availability. Availability follows the standard institutional schedule.',
          code: 'FULL_TIME_FIXED_SCHEDULE',
        });
      }

      if (teacherRow) {
        teacherId = teacherRow.id;
      }
    }

    const { slots, availability } = req.body || {};

    if (Array.isArray(slots)) {
      await query('DELETE FROM teacher_availability WHERE teacher_id = ?', [teacherId]);
      for (const slot of slots) {
        if (slot.day && slot.start && slot.end) {
          const s = formatTo24HourTime(slot.start);
          const e = formatTo24HourTime(slot.end);
          if (s && e) {
            await query(
              'INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
              [teacherId, slot.day, s, e]
            );
          }
        }
      }
    } else if (typeof availability === 'string') {
      const { facultyService } = require('../services/faculty.service');
      await facultyService.updateFaculty(teacherId, {
        availability,
        email: req.user?.email,
        name: req.user?.name,
      });
    }

    const updatedRows = await query('SELECT day_of_week, start_time, end_time FROM teacher_availability WHERE teacher_id = ?', [teacherId]);
    res.json({ data: updatedRows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


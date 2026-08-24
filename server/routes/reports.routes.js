const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { query } = require('../utils/db');

const router = express.Router();
router.use(authMiddleware);

function toMinutes(value) {
  const [hour, minute = '0'] = String(value || '00:00').split(':').map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

router.get('/', async (req, res, next) => {
  try {
    const { academicYearId, semesterId, program, facultyId, department } = req.query;
    const role = String(req.user?.role || '').toLowerCase();

    let [facultyRows, roomRows, scheduleRows, examRows] = await Promise.all([
      query(
        `SELECT t.id, t.name, t.status, pm.name AS department, pm.code AS department_code, t.email
         FROM teachers t
         LEFT JOIN program_majors pm ON pm.id = t.program_major_id
         ORDER BY t.name ASC`
      ),
      query(
        `SELECT number, building, capacity, type, status
         FROM rooms
         ORDER BY number ASC`
      ),
      query(
        `SELECT sc.id, sc.day, sc.start_time, sc.end_time, sc.subject_code, sc.faculty_id, sc.room_number, sc.section_id,
                sc.academic_year_id, sc.semester_id, sub.program_code, sec.course_code
         FROM schedules sc
         LEFT JOIN subjects sub ON sub.code = sc.subject_code
         LEFT JOIN sections sec ON sec.id = sc.section_id`
      ),
      query(
        `SELECT es.id, es.term, es.exam_date, es.subject_code, es.proctor_id, es.room_number, es.program_code
         FROM exam_schedules es`
      ),
    ]);

    // Apply role-based filtering
    if (role === 'teacher') {
      let teacherId = req.user.teacherId;
      if (!teacherId && req.user.email) {
        const matchingT = facultyRows.find((f) => f.email && f.email.toLowerCase() === req.user.email.toLowerCase());
        if (matchingT) teacherId = matchingT.id;
      }
      if (teacherId) {
        facultyRows = facultyRows.filter((f) => String(f.id) === String(teacherId));
        scheduleRows = scheduleRows.filter((s) => String(s.faculty_id) === String(teacherId));
        examRows = examRows.filter((e) => String(e.proctor_id) === String(teacherId));
      }
    } else if (role === 'program_head') {
      let allowedPrograms = [];
      if (req.user.sub) {
        const majors = await query('SELECT program_code, code FROM program_majors WHERE program_head_id = ?', [req.user.sub]);
        for (const m of majors) {
          if (m.program_code) allowedPrograms.push(m.program_code);
          if (m.code) allowedPrograms.push(m.code);
        }
      }
      if (req.user.program) allowedPrograms.push(req.user.program);
      if (req.user.programCode) allowedPrograms.push(req.user.programCode);
      allowedPrograms = [...new Set(allowedPrograms.map((p) => String(p).toUpperCase()))];

      if (allowedPrograms.length > 0) {
        facultyRows = facultyRows.filter((f) => {
          const dept = String(f.department_code || f.department || '').toUpperCase();
          return allowedPrograms.includes(dept) || allowedPrograms.some((p) => dept.includes(p));
        });
        scheduleRows = scheduleRows.filter((s) => {
          const subP = String(s.program_code || '').toUpperCase();
          const secC = String(s.course_code || '').toUpperCase();
          return allowedPrograms.includes(subP) || allowedPrograms.includes(secC) || allowedPrograms.some((p) => subP.includes(p) || secC.includes(p));
        });
        examRows = examRows.filter((e) => {
          const ep = String(e.program_code || '').toUpperCase();
          return allowedPrograms.includes(ep) || allowedPrograms.some((p) => ep.includes(p));
        });
      }
    }

    if (academicYearId) {
      scheduleRows = scheduleRows.filter((s) => String(s.academic_year_id) === String(academicYearId));
    }
    if (semesterId) {
      scheduleRows = scheduleRows.filter((s) => String(s.semester_id) === String(semesterId));
    }
    if (program || department) {
      const pFilter = String(program || department).toUpperCase();
      facultyRows = facultyRows.filter((f) => String(f.department_code || f.department || '').toUpperCase().includes(pFilter));
      scheduleRows = scheduleRows.filter((s) => String(s.program_code || s.course_code || '').toUpperCase().includes(pFilter));
    }
    if (facultyId) {
      facultyRows = facultyRows.filter((f) => String(f.id) === String(facultyId));
      scheduleRows = scheduleRows.filter((s) => String(s.faculty_id) === String(facultyId));
    }

    // Calculate actual faculty workload directly from assigned class schedules
    const facultyWorkload = facultyRows.map((f) => {
      const assigned = scheduleRows.filter((s) => s.faculty_id && String(s.faculty_id) === String(f.id));

      let totalTeachingMinutes = 0;
      const distinctSubjects = new Set();
      const distinctSections = new Set();

      for (const s of assigned) {
        const startMin = toMinutes(s.start_time);
        const endMin = toMinutes(s.end_time || s.start_time);
        const duration = Math.max(0, endMin - startMin);
        totalTeachingMinutes += duration;

        if (s.subject_code) distinctSubjects.add(s.subject_code);
        if (s.section_id) distinctSections.add(s.section_id);
      }

      const teachingHoursPerWeek = Number((totalTeachingMinutes / 60).toFixed(1));

      return {
        id: String(f.id),
        name: f.name,
        department: f.department || f.department_code || 'General Education',
        status: f.status,
        classesCount: assigned.length,
        weeklyHours: teachingHoursPerWeek,
        estimatedWeeklyHours: teachingHoursPerWeek,
        subjectsHandled: Array.from(distinctSubjects),
        sectionsHandledCount: distinctSections.size,
      };
    });

    // Calculate room utilization from booked schedules
    const roomUtilization = roomRows.map((r) => {
      const bookings = scheduleRows.filter((s) => s.room_number && String(s.room_number) === String(r.number));

      let totalBookedMinutes = 0;
      for (const b of bookings) {
        const startMin = toMinutes(b.start_time);
        const endMin = toMinutes(b.end_time || b.start_time);
        totalBookedMinutes += Math.max(0, endMin - startMin);
      }

      // Total available weekly hours assuming 10 hrs/day * 6 days = 60 hrs
      const weeklyHoursBooked = Number((totalBookedMinutes / 60).toFixed(1));
      const utilizationRate = Math.min(100, Number(((weeklyHoursBooked / 60) * 100).toFixed(1)));

      return {
        number: r.number,
        building: r.building,
        capacity: Number(r.capacity),
        type: r.type || 'Lecture',
        status: r.status,
        bookingsCount: bookings.length,
        weeklyHoursBooked,
        utilizationRate,
      };
    });

    res.json({
      data: {
        summary: {
          totalFaculty: facultyRows.length,
          fullTimeFaculty: facultyRows.filter((f) => f.status === 'Full-Time').length,
          partTimeFaculty: facultyRows.filter((f) => f.status === 'Part-Time').length,
          totalRooms: roomRows.length,
          totalSchedules: scheduleRows.length,
          totalExams: examRows.length,
        },
        facultyWorkload,
        roomUtilization,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

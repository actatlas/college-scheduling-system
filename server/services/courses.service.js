const { query } = require('../utils/db');

async function listCourses() {
  // Frontend CoursesPage expects:
  // { code, name, year }
  const rows = await query(
    `SELECT code, name, COALESCE(year_duration, '') AS year_duration
     FROM courses
     ORDER BY code ASC`
  );

  return rows.map((c) => ({
    code: c.code,
    name: c.name,
    year: c.year_duration,
  }));
}

async function createCourse({ code, name, year }) {
  await query(
    'INSERT INTO courses (code, name, year_duration) VALUES (?, ?, ?)',
    [code, name, year || null]
  );
  return { code, name, year };
}

const coursesService = { listCourses, createCourse };
module.exports = { coursesService };


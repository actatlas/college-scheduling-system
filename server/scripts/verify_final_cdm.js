const { pool } = require('../database/pool');

async function verify() {

  const [[{ programsCount }]] = await pool.query('SELECT COUNT(*) as programsCount FROM programs');
  const [programs] = await pool.query('SELECT code, name FROM programs');
  const [[{ majorsCount }]] = await pool.query('SELECT COUNT(*) as majorsCount FROM program_majors');
  const [[{ subjectsCount }]] = await pool.query("SELECT COUNT(*) as subjectsCount FROM subjects WHERE program_code = 'TEP'");
  const [[{ sectionsCount }]] = await pool.query("SELECT COUNT(*) as sectionsCount FROM sections WHERE program_code = 'TEP'");
  const [[{ teachersCount }]] = await pool.query('SELECT COUNT(*) as teachersCount FROM teachers');
  const [[{ schedulesCount }]] = await pool.query('SELECT COUNT(*) as schedulesCount FROM schedules');
  const [[{ usersCount }]] = await pool.query('SELECT COUNT(*) as usersCount FROM users');
  const [days] = await pool.query('SELECT id, name FROM days ORDER BY id');
  const [tables] = await pool.query('SHOW TABLES');
  const tableNames = tables.map((t) => Object.values(t)[0]);

  console.log('PROGRAMS (' + programsCount + '):', programs.map((p) => p.code).join(', '));
  console.log('MAJORS COUNT:', majorsCount);
  console.log('TEP SUBJECTS COUNT:', subjectsCount);
  console.log('TEP SECTIONS COUNT:', sectionsCount);
  console.log('TEACHERS COUNT:', teachersCount);
  console.log('SCHEDULES COUNT:', schedulesCount);
  console.log('USERS COUNT:', usersCount);
  console.log('DAYS SEEDED:', days.map((d) => d.name).join(', '));
  console.log('TABLES IN DB:', tableNames.join(', '));

  const removedTables = ['courses', 'buildings', 'teacher_availability'].filter((t) => tableNames.includes(t));
  console.log('ANY REMOVED TABLES STILL IN DB?:', removedTables.length > 0 ? removedTables : 'NONE (Correct!)');

  await pool.end();
}
verify().catch(console.error);

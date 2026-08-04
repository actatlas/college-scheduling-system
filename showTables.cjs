const { pool } = require('./server/database/pool');
async function test() {
  const [rows] = await pool.query('SHOW TABLES');
  console.log('Tables:', rows);
  process.exit(0);
}
test().catch(console.error);

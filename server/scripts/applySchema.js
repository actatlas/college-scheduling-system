const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('../database/pool');

async function apply() {
  await testConnection();

  const sqlPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Simple and robust parser for SQL scripts: split by semicolon, ignoring inside comments
  const rawStatements = sql.split(';');
  const statements = [];
  for (let raw of rawStatements) {
    const cleaned = raw
      .replace(/\/\*[\s\S]*?\*\//g, '') // remove multiline comments
      .replace(/--.*$/gm, '')           // remove single line comments
      .trim();
    if (cleaned) {
      statements.push(cleaned);
    }
  }

  const conn = await pool.getConnection();
  try {
    // Drop existing tables to ensure a clean schema rebuild
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    const [tables] = await conn.query("SHOW TABLES");
    for (const row of tables) {
      const tableName = Object.values(row)[0];
      await conn.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Cleared existing tables.');

    for (const stmt of statements) {
      try {
        await conn.query(stmt);
      } catch (err) {
        console.error('Failed statement:', stmt.slice(0, 150));
        console.error('Error message:', err.message || err);
        throw err;
      }
    }
    console.log(`Schema applied to ${process.env.DB_NAME || 'srcb_scheduler'} successfully.`);
  } finally {
    conn.release();
    process.exit(0);
  }
}

apply().catch((err) => {
  console.error('applySchema error:', err);
  process.exit(1);
});



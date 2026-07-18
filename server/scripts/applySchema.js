const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('../database/pool');

async function apply() {
  await testConnection();

  const sqlPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split on semicolon followed by linebreaks to avoid splitting inside routines.
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const conn = await pool.getConnection();
  try {
    for (const stmt of statements) {
      try {
        // skip comments-only statements
        if (/^--/.test(stmt)) continue;
        await conn.query(stmt);
      } catch (err) {
        console.error('Failed statement:', stmt.slice(0, 120));
        console.error(err.message || err);
      }
    }
    console.log(`Schema applied to ${process.env.DB_NAME || 'srcb_scheduler'} (attempted statements).`);
  } finally {
    conn.release();
    process.exit(0);
  }
}

apply().catch((err) => {
  console.error('applySchema error:', err);
  process.exit(1);
});

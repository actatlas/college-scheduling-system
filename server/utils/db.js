const { pool } = require('../database/pool');

async function query(sql, params) {
  const [result] = await pool.execute(sql, params);
  const normalizedSql = String(sql).trim().toLowerCase();

  if (normalizedSql.startsWith('select')) {
    return result;
  }

  return [result];
}

module.exports = { query };


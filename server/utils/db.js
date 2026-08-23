const { pool } = require('../database/pool');

let mockExecutor = null;

function setQueryExecutor(fn) {
  mockExecutor = fn;
}

async function query(sql, params) {
  if (mockExecutor) {
    return mockExecutor(sql, params);
  }

  const [result] = await pool.execute(sql, params);
  const normalizedSql = String(sql).trim().toLowerCase();

  if (normalizedSql.startsWith('select')) {
    return result;
  }

  return [result];
}

module.exports = { query, setQueryExecutor };

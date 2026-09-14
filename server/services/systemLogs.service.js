const { query } = require('../utils/db');

let tableEnsured = false;
async function ensureSystemLogsTable() {
  if (tableEnsured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED DEFAULT NULL,
        user_name VARCHAR(160) DEFAULT NULL,
        user_email VARCHAR(190) DEFAULT NULL,
        role VARCHAR(50) NOT NULL,
        module VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        target_id VARCHAR(100) DEFAULT NULL,
        target_type VARCHAR(100) DEFAULT NULL,
        status ENUM('Success', 'Failed') NOT NULL DEFAULT 'Success',
        ip_address VARCHAR(45) DEFAULT NULL,
        details JSON DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_syslogs_user (user_id),
        KEY idx_syslogs_role (role),
        KEY idx_syslogs_module (module),
        KEY idx_syslogs_action (action),
        KEY idx_syslogs_status (status),
        KEY idx_syslogs_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    tableEnsured = true;
  } catch (err) {
    // Graceful fallback for mock DB or test environments
  }
}

// In-memory fallback if running in mock/test mode
let inMemoryLogs = [];

function getClientIp(req) {
  if (!req) return null;
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || null;
}

/**
 * Safely sanitizes metadata to avoid recording passwords, tokens, or sensitive secret values
 */
function sanitizeDetails(details) {
  if (!details || typeof details !== 'object') return null;
  try {
    const copy = JSON.parse(JSON.stringify(details));
    const sensitiveKeys = ['password', 'password_hash', 'currentpassword', 'newpassword', 'token', 'secret', 'authorization'];
    
    function recursiveClean(obj) {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.includes(key.toLowerCase())) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          recursiveClean(obj[key]);
        }
      }
    }
    recursiveClean(copy);
    return copy;
  } catch {
    return null;
  }
}

/**
 * Record an audit log entry
 */
async function logAction({
  req = null,
  user = null,
  module,
  action,
  description,
  targetId = null,
  targetType = null,
  status = 'Success',
  ipAddress = null,
  details = null,
}) {
  try {
    await ensureSystemLogsTable();

    const effectiveUser = user || req?.user || null;
    const userId = effectiveUser?.id || effectiveUser?.sub || null;
    const userName = effectiveUser?.name || (effectiveUser?.role === 'super_admin' ? 'ICT Super Administrator' : 'System');
    const userEmail = effectiveUser?.email || null;
    const role = effectiveUser?.role || 'system';
    const effectiveIp = ipAddress || getClientIp(req);
    const safeDetails = sanitizeDetails(details);
    const detailsJson = safeDetails ? JSON.stringify(safeDetails) : null;

    try {
      const res = await query(
        `INSERT INTO system_logs 
          (user_id, user_name, user_email, role, module, action, description, target_id, target_type, status, ip_address, details)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          userName,
          userEmail,
          role,
          module,
          action,
          description,
          targetId ? String(targetId) : null,
          targetType ? String(targetType) : null,
          status,
          effectiveIp,
          detailsJson,
        ]
      );

      const insertResult = Array.isArray(res) ? res[0] : res;
      const logEntry = {
        id: insertResult?.insertId || Date.now(),
        userId,
        userName,
        userEmail,
        role,
        module,
        action,
        description,
        targetId,
        targetType,
        status,
        ipAddress: effectiveIp,
        details: safeDetails,
        createdAt: new Date().toISOString(),
      };
      inMemoryLogs.unshift({
        id: logEntry.id,
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        role,
        module,
        action,
        description,
        target_id: targetId ? String(targetId) : null,
        target_type: targetType ? String(targetType) : null,
        status,
        ip_address: effectiveIp,
        details: safeDetails,
        created_at: logEntry.createdAt,
      });
      return logEntry;
    } catch (dbErr) {
      // In-memory fallback
      const logEntry = {
        id: inMemoryLogs.length + 1,
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        role,
        module,
        action,
        description,
        target_id: targetId ? String(targetId) : null,
        target_type: targetType ? String(targetType) : null,
        status,
        ip_address: effectiveIp,
        details: safeDetails,
        created_at: new Date().toISOString(),
      };
      inMemoryLogs.unshift(logEntry);
      return {
        id: logEntry.id,
        userId,
        userName,
        userEmail,
        role,
        module,
        action,
        description,
        targetId,
        targetType,
        status,
        ipAddress: effectiveIp,
        details: safeDetails,
        createdAt: logEntry.created_at,
      };
    }
  } catch (err) {
    // Non-blocking logger failure
    console.error('[systemLogs] Failed to record log:', err.message);
    return null;
  }
}

/**
 * List audit logs with pagination and filters
 */
async function listSystemLogs({
  search = '',
  userId = null,
  role = null,
  module = null,
  action = null,
  status = null,
  startDate = null,
  endDate = null,
  page = 1,
  limit = 20,
} = {}) {
  await ensureSystemLogsTable();

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  try {
    const whereConditions = [];
    const params = [];

    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      whereConditions.push('(LOWER(description) LIKE ? OR LOWER(user_name) LIKE ? OR LOWER(user_email) LIKE ? OR LOWER(action) LIKE ? OR LOWER(target_id) LIKE ?)');
      params.push(s, s, s, s, s);
    }

    if (userId) {
      whereConditions.push('user_id = ?');
      params.push(userId);
    }

    if (role && role !== 'ALL') {
      whereConditions.push('LOWER(role) = LOWER(?)');
      params.push(role);
    }

    if (module && module !== 'ALL') {
      whereConditions.push('module = ?');
      params.push(module);
    }

    if (action && action !== 'ALL') {
      whereConditions.push('action = ?');
      params.push(action);
    }

    if (status && status !== 'ALL') {
      whereConditions.push('status = ?');
      params.push(status);
    }

    if (startDate) {
      whereConditions.push('created_at >= ?');
      params.push(`${startDate} 00:00:00`);
    }

    if (endDate) {
      whereConditions.push('created_at <= ?');
      params.push(`${endDate} 23:59:59`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countRows = await query(`SELECT COUNT(*) as total FROM system_logs ${whereClause}`, params);
    const total = Number(countRows[0]?.total || 0);

    const dataRows = await query(
      `SELECT * FROM system_logs ${whereClause} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    const logs = (Array.isArray(dataRows) ? dataRows : []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name || 'System',
      userEmail: r.user_email || '',
      role: r.role,
      module: r.module,
      action: r.action,
      description: r.description,
      targetId: r.target_id,
      targetType: r.target_type,
      status: r.status,
      ipAddress: r.ip_address,
      details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details,
      createdAt: r.created_at,
    }));

    return {
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  } catch (err) {
    // In-memory fallback
    let filtered = [...inMemoryLogs];

    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(
        (l) =>
          (l.description && l.description.toLowerCase().includes(s)) ||
          (l.user_name && l.user_name.toLowerCase().includes(s)) ||
          (l.user_email && l.user_email.toLowerCase().includes(s)) ||
          (l.action && l.action.toLowerCase().includes(s)) ||
          (l.target_id && l.target_id.toLowerCase().includes(s))
      );
    }

    if (role && role !== 'ALL') {
      filtered = filtered.filter((l) => String(l.role).toLowerCase() === role.toLowerCase());
    }

    if (module && module !== 'ALL') {
      filtered = filtered.filter((l) => l.module === module);
    }

    if (action && action !== 'ALL') {
      filtered = filtered.filter((l) => l.action === action);
    }

    if (status && status !== 'ALL') {
      filtered = filtered.filter((l) => l.status === status);
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limitNum).map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name || 'System',
      userEmail: r.user_email || '',
      role: r.role,
      module: r.module,
      action: r.action,
      description: r.description,
      targetId: r.target_id,
      targetType: r.target_type,
      status: r.status,
      ipAddress: r.ip_address,
      details: r.details,
      createdAt: r.created_at,
    }));

    return {
      data: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }
}

/**
 * Get distinct filter metadata for UI dropdowns
 */
async function getFilterOptions() {
  await ensureSystemLogsTable();
  try {
    const modules = await query('SELECT DISTINCT module FROM system_logs ORDER BY module ASC');
    const actions = await query('SELECT DISTINCT action FROM system_logs ORDER BY action ASC');
    const roles = await query('SELECT DISTINCT role FROM system_logs ORDER BY role ASC');
    const users = await query('SELECT DISTINCT user_id, user_name, user_email FROM system_logs WHERE user_id IS NOT NULL ORDER BY user_name ASC');

    return {
      modules: modules.map((m) => m.module).filter(Boolean),
      actions: actions.map((a) => a.action).filter(Boolean),
      roles: roles.map((r) => r.role).filter(Boolean),
      users: users.map((u) => ({ id: u.user_id, name: u.user_name, email: u.user_email })),
    };
  } catch {
    const modules = Array.from(new Set(inMemoryLogs.map((l) => l.module)));
    const actions = Array.from(new Set(inMemoryLogs.map((l) => l.action)));
    const roles = Array.from(new Set(inMemoryLogs.map((l) => l.role)));
    return { modules, actions, roles, users: [] };
  }
}

async function getSystemLogById(id) {
  await ensureSystemLogsTable();
  try {
    const rows = await query('SELECT * FROM system_logs WHERE id = ? LIMIT 1', [id]);
    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        userId: r.user_id,
        userName: r.user_name || 'System',
        userEmail: r.user_email || '',
        role: r.role,
        module: r.module,
        action: r.action,
        description: r.description,
        targetId: r.target_id,
        targetType: r.target_type,
        status: r.status,
        ipAddress: r.ip_address,
        details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details,
        createdAt: r.created_at,
      };
    }
  } catch {
    const log = inMemoryLogs.find((l) => String(l.id) === String(id));
    if (log) return log;
  }
  return null;
}

module.exports = {
  ensureSystemLogsTable,
  logAction,
  listSystemLogs,
  getFilterOptions,
  getSystemLogById,
};

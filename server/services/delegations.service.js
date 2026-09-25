const { query } = require('../utils/db');
const { logAction } = require('./systemLogs.service');

let tableEnsured = false;

// Fallback in-memory store for test/mock environments
let inMemoryDelegations = [
  {
    id: 1,
    user_id: 3,
    user_name: 'Dr. Alan Turing',
    user_email: 'ithead@srcb.edu.ph',
    program_code: 'BSIT',
    privilege_type: 'MANAGE_EXAM_SCHEDULE',
    status: 'ACTIVE',
    granted_by: 2,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    user_id: 3,
    user_name: 'Dr. Alan Turing',
    user_email: 'ithead@srcb.edu.ph',
    program_code: 'BSIT',
    privilege_type: 'MANAGE_CLASS_SCHEDULE',
    status: 'ACTIVE',
    granted_by: 2,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    user_id: 4,
    user_name: 'Dr. Peter Drucker',
    user_email: 'businesshead@srcb.edu.ph',
    program_code: 'BSBA',
    privilege_type: 'MANAGE_EXAM_SCHEDULE',
    status: 'REVOKED',
    granted_by: 2,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    user_id: 4,
    user_name: 'Dr. Peter Drucker',
    user_email: 'businesshead@srcb.edu.ph',
    program_code: 'BSBA',
    privilege_type: 'MANAGE_CLASS_SCHEDULE',
    status: 'ACTIVE',
    granted_by: 2,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 5,
    user_id: 5,
    user_name: 'Dr. August Vollmer',
    user_email: 'crimhead@srcb.edu.ph',
    program_code: 'BSCRIM',
    privilege_type: 'MANAGE_EXAM_SCHEDULE',
    status: 'REVOKED',
    granted_by: 2,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 6,
    user_id: 6,
    user_name: 'Prof. Georges Escoffier',
    user_email: 'hmhead@srcb.edu.ph',
    program_code: 'BSHM',
    privilege_type: 'MANAGE_EXAM_SCHEDULE',
    status: 'REVOKED',
    granted_by: 2,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 7,
    user_id: 7,
    user_name: 'Dr. Maria Montessori',
    user_email: 'educhead@srcb.edu.ph',
    program_code: 'TEP',
    privilege_type: 'MANAGE_EXAM_SCHEDULE',
    status: 'REVOKED',
    granted_by: 2,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

async function ensureDelegationsTable() {
  if (tableEnsured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS delegations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        program_code VARCHAR(50) NOT NULL,
        privilege_type VARCHAR(100) NOT NULL,
        status ENUM('ACTIVE', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
        granted_by BIGINT UNSIGNED DEFAULT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY idx_user_privilege_prog (user_id, privilege_type, program_code),
        KEY idx_delegations_user (user_id),
        KEY idx_delegations_prog (program_code),
        KEY idx_delegations_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check count and seed initial defaults if empty
    const rows = await query('SELECT COUNT(*) AS cnt FROM delegations');
    const cnt = Number(rows[0]?.cnt || 0);

    if (cnt === 0) {
      // Find program heads
      const heads = await query("SELECT id, name, email, program FROM users WHERE role = 'program_head'");
      for (const head of heads) {
        const progCode = head.program === 'ITP' ? 'BSIT' : head.program === 'BAP' ? 'BSBA' : head.program === 'CJEP' ? 'BSCRIM' : head.program === 'HMP' ? 'BSHM' : head.program === 'TEP' ? 'TEP' : (head.program || 'BSIT');
        
        // Dr Alan Turing (IT) gets active MANAGE_EXAM_SCHEDULE by default
        const examStatus = head.email.includes('ithead') ? 'ACTIVE' : 'REVOKED';

        await query(`
          INSERT IGNORE INTO delegations (user_id, program_code, privilege_type, status, granted_by)
          VALUES 
            (?, ?, 'MANAGE_EXAM_SCHEDULE', ?, 2),
            (?, ?, 'MANAGE_CLASS_SCHEDULE', 'ACTIVE', 2),
            (?, ?, 'ROOM_REALLOCATION', 'ACTIVE', 2)
        `, [head.id, progCode, examStatus, head.id, progCode, head.id, progCode]);
      }
    }

    tableEnsured = true;
  } catch (err) {
    // Fallback in test/mock mode
  }
}

/**
 * Lists all delegations grouped by Program Head user across the 5 programs
 */
async function listDelegations() {
  await ensureDelegationsTable();

  try {
    const users = await query(`
      SELECT 
        u.id AS user_id, 
        u.name AS user_name, 
        u.email AS user_email, 
        u.program AS raw_program, 
        u.status AS user_status,
        pm.code AS major_code,
        pm.name AS major_name
      FROM users u
      LEFT JOIN program_majors pm ON pm.program_head_id = u.id
      WHERE u.role = 'program_head'
      ORDER BY u.id ASC
    `);

    const delegationRows = await query(`
      SELECT id, user_id, program_code, privilege_type, status, granted_by, updated_at, created_at
      FROM delegations
    `);

    const result = users.map((u) => {
      const progCode = u.major_code || (u.raw_program === 'ITP' ? 'BSIT' : u.raw_program === 'BAP' ? 'BSBA' : u.raw_program === 'CJEP' ? 'BSCRIM' : u.raw_program === 'HMP' ? 'BSHM' : u.raw_program === 'TEP' ? 'TEP' : u.raw_program || 'BSIT');
      
      const userDels = delegationRows.filter((d) => String(d.user_id) === String(u.user_id));
      const activePrivileges = userDels.filter((d) => d.status === 'ACTIVE').map((d) => d.privilege_type);

      return {
        userId: u.user_id,
        userName: u.user_name,
        userEmail: u.user_email,
        programCode: progCode,
        programName: u.major_name || `${progCode} Department`,
        userStatus: u.user_status,
        delegations: userDels,
        grantedPrivileges: activePrivileges,
        hasExamSchedulePrivilege: activePrivileges.includes('MANAGE_EXAM_SCHEDULE'),
        hasClassSchedulePrivilege: activePrivileges.includes('MANAGE_CLASS_SCHEDULE'),
        hasRoomReallocationPrivilege: activePrivileges.includes('ROOM_REALLOCATION'),
      };
    });

    if (result.length > 0) return result;
  } catch {
    // Return in-memory fallback
  }

  // In-memory fallback
  const grouped = new Map();
  for (const del of inMemoryDelegations) {
    if (!grouped.has(del.user_id)) {
      grouped.set(del.user_id, {
        userId: del.user_id,
        userName: del.user_name,
        userEmail: del.user_email,
        programCode: del.program_code,
        programName: `${del.program_code} Department`,
        userStatus: 'Active',
        delegations: [],
        grantedPrivileges: [],
        hasExamSchedulePrivilege: false,
        hasClassSchedulePrivilege: false,
        hasRoomReallocationPrivilege: false,
      });
    }
    const item = grouped.get(del.user_id);
    item.delegations.push(del);
    if (del.status === 'ACTIVE') {
      item.grantedPrivileges.push(del.privilege_type);
      if (del.privilege_type === 'MANAGE_EXAM_SCHEDULE') item.hasExamSchedulePrivilege = true;
      if (del.privilege_type === 'MANAGE_CLASS_SCHEDULE') item.hasClassSchedulePrivilege = true;
      if (del.privilege_type === 'ROOM_REALLOCATION') item.hasRoomReallocationPrivilege = true;
    }
  }

  return Array.from(grouped.values());
}

/**
 * Checks if a specific user has an active privilege for a given program
 */
async function hasPrivilege(userId, privilegeType, programCode = null) {
  if (!userId) return false;
  await ensureDelegationsTable();

  try {
    const rows = await query(
      'SELECT id, program_code FROM delegations WHERE user_id = ? AND privilege_type = ? AND status = "ACTIVE"',
      [userId, privilegeType]
    );
    if (!rows || rows.length === 0) return false;
    if (!programCode || programCode === 'ALL') return true;

    return rows.some((r) => {
      const p = String(r.program_code || '').toUpperCase().trim();
      const target = String(programCode).toUpperCase().trim();
      if (p === target || p === 'ALL') return true;
      if ((p === 'BSIT' || p === 'ITP') && (target === 'BSIT' || target === 'ITP')) return true;
      if ((p === 'BSBA' || p === 'BAP' || p === 'BSA') && (target === 'BSBA' || target === 'BAP' || target === 'BSA')) return true;
      if ((p === 'BSHM' || p === 'HMP') && (target === 'BSHM' || target === 'HMP')) return true;
      if ((p === 'BSCRIM' || p === 'CJEP') && (target === 'BSCRIM' || target === 'CJEP')) return true;
      if ((p === 'TEP' || p === 'BSED' || p === 'BEED') && (target === 'TEP' || target === 'BSED' || target === 'BEED')) return true;
      return false;
    });
  } catch {
    const found = inMemoryDelegations.find(
      (d) =>
        String(d.user_id) === String(userId) &&
        d.privilege_type === privilegeType &&
        d.status === 'ACTIVE'
    );
    return !!found;
  }
}

/**
 * Grants or revokes specific privileges for a target Program Head
 */
async function grantOrRevokePrivileges({ userId, programCode, privileges, grantedBy, req = null }) {
  await ensureDelegationsTable();

  const allPrivilegeTypes = ['MANAGE_EXAM_SCHEDULE', 'MANAGE_CLASS_SCHEDULE', 'ROOM_REALLOCATION'];
  const targetPrivileges = Array.isArray(privileges) ? privileges : [];

  let targetUser = null;
  try {
    const rows = await query('SELECT id, name, email, program FROM users WHERE id = ? LIMIT 1', [userId]);
    targetUser = rows[0] || null;
  } catch {
    // fallback
  }

  const targetUserName = targetUser?.name || `Program Head (#${userId})`;
  const targetUserProg = programCode || targetUser?.program || 'BSIT';

  for (const priv of allPrivilegeTypes) {
    const shouldBeActive = targetPrivileges.includes(priv);
    const newStatus = shouldBeActive ? 'ACTIVE' : 'REVOKED';

    try {
      await query(
        `INSERT INTO delegations (user_id, program_code, privilege_type, status, granted_by, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE status = VALUES(status), granted_by = VALUES(granted_by), updated_at = CURRENT_TIMESTAMP`,
        [userId, targetUserProg, priv, newStatus, grantedBy || null]
      );
      await query(
        `UPDATE delegations SET status = ?, granted_by = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND privilege_type = ?`,
        [newStatus, grantedBy || null, userId, priv]
      );
    } catch {
      // In-memory update
      const existing = inMemoryDelegations.find(
        (d) => String(d.user_id) === String(userId) && d.privilege_type === priv
      );
      if (existing) {
        existing.status = newStatus;
        existing.updated_at = new Date().toISOString();
        if (grantedBy) existing.granted_by = grantedBy;
      } else {
        inMemoryDelegations.push({
          id: Date.now() + Math.floor(Math.random() * 1000),
          user_id: Number(userId),
          user_name: targetUserName,
          user_email: targetUser?.email || '',
          program_code: targetUserProg,
          privilege_type: priv,
          status: newStatus,
          granted_by: grantedBy || 2,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  // Record in immutable SRCB Audit Trail
  const activeLabels = targetPrivileges.map((p) => {
    if (p === 'MANAGE_EXAM_SCHEDULE') return 'Exam Scheduling & Room Allocation';
    if (p === 'MANAGE_CLASS_SCHEDULE') return 'Class Scheduling Adjustments';
    if (p === 'ROOM_REALLOCATION') return 'Room Reallocation';
    return p;
  });

  const description = activeLabels.length > 0
    ? `Updated delegated privileges for ${targetUserName} (${targetUserProg}): Authorized [${activeLabels.join(', ')}].`
    : `Revoked all delegated privileges for ${targetUserName} (${targetUserProg}). Account placed in Read-Only exam view.`;

  await logAction({
    req,
    module: 'Administrative Governance',
    action: targetPrivileges.includes('MANAGE_EXAM_SCHEDULE') ? 'Granted Privilege' : 'Updated Privileges',
    description,
    targetId: userId,
    targetType: 'UserAccount',
    status: 'Success',
    details: {
      userId,
      targetUserName,
      programCode: targetUserProg,
      privileges: targetPrivileges,
      grantedBy,
    },
  });

  return {
    userId,
    programCode: targetUserProg,
    grantedPrivileges: targetPrivileges,
    updatedAt: new Date().toISOString(),
  };
}

module.exports = {
  ensureDelegationsTable,
  listDelegations,
  hasPrivilege,
  grantOrRevokePrivileges,
};

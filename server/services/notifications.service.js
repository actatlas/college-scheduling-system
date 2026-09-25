const { query } = require('../utils/db');
const { isProgramMatch } = require('../utils/programScope');

async function ensureNotificationsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(60) NOT NULL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
        link VARCHAR(255) DEFAULT NULL,
        target_role VARCHAR(100) DEFAULT NULL,
        target_user_id BIGINT UNSIGNED DEFAULT NULL,
        target_program VARCHAR(50) DEFAULT NULL,
        target_teacher_id VARCHAR(50) DEFAULT NULL,
        read_by_user_ids JSON DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_notif_role (target_role),
        KEY idx_notif_user (target_user_id),
        KEY idx_notif_program (target_program),
        KEY idx_notif_teacher (target_teacher_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const initialSeeds = [
      // 1. Super Admin Only
      {
        id: 'notif-sa-1',
        title: 'ICT Governance & Security Active',
        message: 'System audit logging, user role management, and institutional access control matrix initialized.',
        type: 'info',
        link: '/users',
        target_role: 'super_admin',
        target_user_id: null,
        target_program: null,
        target_teacher_id: null,
      },
      {
        id: 'notif-sa-2',
        title: 'Account Security Monitoring',
        message: 'All registered institutional accounts are monitored under active security policies.',
        type: 'success',
        link: '/users',
        target_role: 'super_admin',
        target_user_id: null,
        target_program: null,
        target_teacher_id: null,
      },
      // 2. Dean of Student Affairs / College Admin Only
      {
        id: 'notif-adm-1',
        title: 'AY 2026–2027 1st Semester Active',
        message: 'Collegiate academic semester timetable configuration and cross-program scheduling window is active.',
        type: 'info',
        link: '/schedules',
        target_role: 'admin',
        target_user_id: null,
        target_program: null,
        target_teacher_id: null,
      },
      {
        id: 'notif-adm-2',
        title: 'Timetable Constraint Engine Ready',
        message: 'Multi-building classroom allocation matrix and conflict validation solver initialized.',
        type: 'success',
        link: '/schedules',
        target_role: 'admin',
        target_user_id: null,
        target_program: null,
        target_teacher_id: null,
      },
      {
        id: 'notif-adm-3',
        title: 'Faculty Load Compliance Review',
        message: 'Review full-time and part-time teaching load limits and departmental instructor allocations.',
        type: 'warning',
        link: '/faculty',
        target_role: 'admin',
        target_user_id: null,
        target_program: null,
        target_teacher_id: null,
      },
      // 3. Program Head (IT / Departmental)
      {
        id: 'notif-ph-1',
        title: 'IT Program Timetable Active',
        message: 'Departmental timetable planning and major subject instructor allocations are active for ITP.',
        type: 'info',
        link: '/dashboard',
        target_role: 'program_head',
        target_user_id: null,
        target_program: 'ITP',
        target_teacher_id: null,
      },
      {
        id: 'notif-ph-2',
        title: 'Curriculum Subject Allocation',
        message: 'Review 1st to 4th year collegiate major subject offerings and laboratory classroom assignments.',
        type: 'success',
        link: '/subjects',
        target_role: 'program_head',
        target_user_id: null,
        target_program: 'ITP',
        target_teacher_id: null,
      },
      // 4. Teachers
      {
        id: 'notif-tch-1',
        title: 'Class Schedule & Venue Assignments Available',
        message: 'Your official teaching schedule and room allocations have been updated for this semester.',
        type: 'info',
        link: '/dashboard',
        target_role: 'teacher',
        target_user_id: null,
        target_program: null,
        target_teacher_id: null,
      },
      {
        id: 'notif-tch-2',
        title: 'Teaching Availability Confirmed',
        message: 'Your teaching availability schedule is locked and registered for academic timetable generation.',
        type: 'success',
        link: '/dashboard',
        target_role: 'teacher',
        target_user_id: null,
        target_program: null,
        target_teacher_id: null,
      },
    ];

    for (const item of initialSeeds) {
      await query(
        `INSERT INTO notifications (id, title, message, type, link, target_role, target_user_id, target_program, target_teacher_id, read_by_user_ids)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           message = VALUES(message),
           target_role = VALUES(target_role),
           target_program = VALUES(target_program),
           target_teacher_id = VALUES(target_teacher_id),
           created_at = CURRENT_TIMESTAMP`,
        [
          item.id,
          item.title,
          item.message,
          item.type,
          item.link,
          item.target_role,
          item.target_user_id,
          item.target_program,
          item.target_teacher_id,
          JSON.stringify([]),
        ]
      );
    }
  } catch (err) {
    // Graceful fallback for mock db or test environments
  }
}

// In-memory fallback if DB tables are in test/mock mode
let inMemoryNotifications = [
  {
    id: 'notif-sa-1',
    title: 'ICT Governance & Security Active',
    message: 'System audit logging, user role management, and institutional access control matrix initialized.',
    type: 'info',
    link: '/users',
    target_role: 'super_admin',
    target_user_id: null,
    target_program: null,
    target_teacher_id: null,
    read_by_user_ids: [],
    created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: 'notif-adm-1',
    title: 'AY 2026–2027 1st Semester Active',
    message: 'Collegiate academic semester timetable configuration and cross-program scheduling window is active.',
    type: 'info',
    link: '/schedules',
    target_role: 'admin',
    target_user_id: null,
    target_program: null,
    target_teacher_id: null,
    read_by_user_ids: [],
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'notif-ph-1',
    title: 'IT Program Timetable Active',
    message: 'Departmental timetable planning and major subject instructor allocations are active for ITP.',
    type: 'info',
    link: '/dashboard',
    target_role: 'program_head',
    target_user_id: null,
    target_program: 'ITP',
    target_teacher_id: null,
    read_by_user_ids: [],
    created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: 'notif-tch-1',
    title: 'Class Schedule & Venue Assignments Available',
    message: 'Your official teaching schedule and room allocations have been updated for this semester.',
    type: 'info',
    link: '/dashboard',
    target_role: 'teacher',
    target_user_id: null,
    target_program: null,
    target_teacher_id: null,
    read_by_user_ids: [],
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
];

function isNotificationTargetingUser(n, user) {
  if (!user) return true;
  const userRole = String(user.role || 'admin').toLowerCase();
  const userId = user.id || user.sub;
  const userProgram = (user.programCode || user.program || 'ITP').toUpperCase();
  const userTeacherId = user.teacherId || null;

  const targetUserId = n.target_user_id || n.targetUserId;
  const targetTeacherId = n.target_teacher_id || n.targetTeacherId;
  const targetProgram = n.target_program || n.targetProgram;
  const targetRole = n.target_role || n.targetRole;

  // 1. Specific User ID targeting
  if (targetUserId) {
    return userId ? String(targetUserId) === String(userId) : false;
  }

  // 2. Specific Teacher ID targeting (for Teacher or Program Head who teaches)
  if (targetTeacherId) {
    return userTeacherId ? String(targetTeacherId).toLowerCase() === String(userTeacherId).toLowerCase() : false;
  }

  // 3. Role-based scoping
  const targetRoles = String(targetRole || '').toLowerCase().split(',').map((r) => r.trim());

  if (targetRoles.includes('all') || targetRoles.length === 0 || !targetRole) {
    // If targeted to a specific program, check program matching
    if (targetProgram && targetProgram !== 'ALL') {
      if (userRole === 'program_head') {
        return (
          isProgramMatch(targetProgram, userProgram) ||
          String(targetProgram).toUpperCase() === userProgram ||
          (user.program && isProgramMatch(targetProgram, user.program))
        );
      }
      return userRole === 'super_admin' || userRole === 'admin';
    }
    return true;
  }

  // Strict role boundaries
  if (userRole === 'super_admin') {
    return targetRoles.includes('super_admin') || targetRoles.includes('all');
  }

  if (userRole === 'admin') {
    // Admin never receives super_admin-only governance alerts
    if (targetRoles.includes('super_admin') && !targetRoles.includes('admin') && !targetRoles.includes('all')) {
      return false;
    }
    return targetRoles.includes('admin') || targetRoles.includes('all');
  }

  if (userRole === 'program_head') {
    // Program Head never receives super_admin alerts
    if (targetRoles.includes('super_admin')) return false;

    // Check if target is program_head
    if (targetRoles.includes('program_head')) {
      if (targetProgram && targetProgram !== 'ALL') {
        return (
          isProgramMatch(targetProgram, userProgram) ||
          String(targetProgram).toUpperCase() === userProgram ||
          (user.program && isProgramMatch(targetProgram, user.program))
        );
      }
      return true;
    }

    return targetRoles.includes('all');
  }

  if (userRole === 'teacher') {
    // Teacher never receives super_admin, admin, or program_head management alerts
    if (targetRoles.includes('super_admin') || targetRoles.includes('admin') || targetRoles.includes('program_head')) {
      return false;
    }
    return targetRoles.includes('teacher') || targetRoles.includes('all');
  }

  return false;
}

async function listNotifications({ user } = {}) {
  await ensureNotificationsTable();

  try {
    const rows = await query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 300');
    if (rows && rows.length > 0) {
      const filtered = rows.filter((n) => isNotificationTargetingUser(n, user));
      const userId = user?.id || user?.sub || null;

      return filtered.map((n) => {
        let readArr = [];
        try {
          readArr = typeof n.read_by_user_ids === 'string' ? JSON.parse(n.read_by_user_ids) : (n.read_by_user_ids || []);
        } catch {
          readArr = [];
        }
        const isRead = userId ? readArr.includes(userId) || readArr.includes(String(userId)) : false;

        return {
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type || 'info',
          link: n.link || '/dashboard',
          timestamp: n.created_at || new Date().toISOString(),
          read: isRead,
          targetRole: n.target_role,
          targetProgram: n.target_program,
          targetUserId: n.target_user_id,
          targetTeacherId: n.target_teacher_id,
        };
      });
    }
  } catch (err) {
    // Fallback to in-memory store
  }

  const filtered = inMemoryNotifications.filter((n) => isNotificationTargetingUser(n, user));
  const userId = user?.id || user?.sub || null;

  return filtered.map((n) => {
    const isRead = userId ? (n.read_by_user_ids || []).includes(userId) : false;
    return {
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type || 'info',
      link: n.link || '/dashboard',
      timestamp: n.created_at || new Date().toISOString(),
      read: isRead,
      targetRole: n.target_role,
      targetProgram: n.target_program,
      targetUserId: n.target_user_id,
      targetTeacherId: n.target_teacher_id,
    };
  });
}

async function createNotification({ title, message, type = 'info', link = '/dashboard', targetRole = null, targetUserId = null, targetProgram = null, targetTeacherId = null }) {
  await ensureNotificationsTable();
  const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const roleStr = Array.isArray(targetRole) ? targetRole.join(',') : targetRole;

  try {
    await query(
      `INSERT INTO notifications (id, title, message, type, link, target_role, target_user_id, target_program, target_teacher_id, read_by_user_ids)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, message, type, link, roleStr, targetUserId, targetProgram, targetTeacherId, JSON.stringify([])]
    );
  } catch (err) {
    // In-memory fallback
    inMemoryNotifications.unshift({
      id,
      title,
      message,
      type,
      link,
      target_role: roleStr,
      target_user_id: targetUserId,
      target_program: targetProgram,
      target_teacher_id: targetTeacherId,
      read_by_user_ids: [],
      created_at: new Date().toISOString(),
    });
  }

  return { id, title, message, type, link, targetRole: roleStr, targetUserId, targetProgram, targetTeacherId };
}

async function markNotificationRead(id, userId) {
  if (!id || !userId) return { success: true };
  try {
    const [row] = await query('SELECT read_by_user_ids FROM notifications WHERE id = ? LIMIT 1', [id]);
    if (row) {
      let readArr = [];
      try {
        readArr = typeof row.read_by_user_ids === 'string' ? JSON.parse(row.read_by_user_ids) : (row.read_by_user_ids || []);
      } catch {
        readArr = [];
      }
      if (!readArr.includes(userId) && !readArr.includes(String(userId))) {
        readArr.push(userId);
      }
      await query('UPDATE notifications SET read_by_user_ids = ? WHERE id = ?', [JSON.stringify(readArr), id]);
    }
  } catch {
    const item = inMemoryNotifications.find((n) => n.id === id);
    if (item && !item.read_by_user_ids.includes(userId)) {
      item.read_by_user_ids.push(userId);
    }
  }
  return { success: true };
}

async function markAllNotificationsRead(user) {
  const userId = user?.id || user?.sub;
  if (!userId) return { success: true };

  try {
    const rows = await query('SELECT id, read_by_user_ids FROM notifications');
    for (const r of rows) {
      let readArr = [];
      try {
        readArr = typeof r.read_by_user_ids === 'string' ? JSON.parse(r.read_by_user_ids) : (r.read_by_user_ids || []);
      } catch {
        readArr = [];
      }
      if (!readArr.includes(userId) && !readArr.includes(String(userId))) {
        readArr.push(userId);
        await query('UPDATE notifications SET read_by_user_ids = ? WHERE id = ?', [JSON.stringify(readArr), r.id]);
      }
    }
  } catch {
    for (const item of inMemoryNotifications) {
      if (!item.read_by_user_ids.includes(userId)) {
        item.read_by_user_ids.push(userId);
      }
    }
  }
  return { success: true };
}

async function deleteNotification(id) {
  if (!id) return { success: true };
  try {
    await query('DELETE FROM notifications WHERE id = ?', [id]);
  } catch {
    inMemoryNotifications = inMemoryNotifications.filter((n) => n.id !== id);
  }
  return { success: true };
}

module.exports = {
  notificationsService: {
    listNotifications,
    createNotification,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    ensureNotificationsTable,
  },
};

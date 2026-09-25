const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  listDelegations,
  grantOrRevokePrivileges,
  hasPrivilege,
} = require('../services/delegations.service');

const router = express.Router();
router.use(authMiddleware);

// GET /api/delegations - list delegations across 5 programs
router.get('/', async (req, res, next) => {
  try {
    const data = await listDelegations();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/delegations/my-privileges - get currently authenticated user's delegations
router.get('/my-privileges', async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.sub;
    const role = String(req.user?.role || '').toLowerCase();

    if (role === 'admin' || role === 'super_admin') {
      return res.json({
        data: {
          isSuperAdmin: role === 'super_admin',
          isAdmin: true,
          hasExamSchedulePrivilege: true,
          hasClassSchedulePrivilege: true,
          hasRoomReallocationPrivilege: true,
          grantedPrivileges: ['MANAGE_EXAM_SCHEDULE', 'MANAGE_CLASS_SCHEDULE', 'ROOM_REALLOCATION'],
        },
      });
    }

    const hasExam = await hasPrivilege(userId, 'MANAGE_EXAM_SCHEDULE');
    const hasClass = await hasPrivilege(userId, 'MANAGE_CLASS_SCHEDULE');
    const hasRoom = await hasPrivilege(userId, 'ROOM_REALLOCATION');

    const granted = [];
    if (hasExam) granted.push('MANAGE_EXAM_SCHEDULE');
    if (hasClass) granted.push('MANAGE_CLASS_SCHEDULE');
    if (hasRoom) granted.push('ROOM_REALLOCATION');

    res.json({
      data: {
        userId,
        role,
        hasExamSchedulePrivilege: hasExam,
        hasClassSchedulePrivilege: hasClass,
        hasRoomReallocationPrivilege: hasRoom,
        grantedPrivileges: granted,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/delegations - grant or update privileges (Admin / DSA / Super Admin)
router.post('/', async (req, res, next) => {
  try {
    const requesterRole = String(req.user?.role || '').toLowerCase();
    if (!['admin', 'super_admin'].includes(requesterRole)) {
      return res.status(403).json({
        error: 'Forbidden: Only Administrators and Dean of Student Affairs can delegate privileges.',
        code: 'UNAUTHORIZED_ROLE',
      });
    }

    const { userId, programCode, privileges } = req.body;
    if (!userId) {
      return res.status(400).json({
        error: 'Target Program Head (userId) is required.',
        code: 'MISSING_FIELD',
      });
    }

    const result = await grantOrRevokePrivileges({
      userId,
      programCode,
      privileges,
      grantedBy: req.user?.id || req.user?.sub || 2,
      req,
    });

    res.json({
      message: 'Delegated privileges updated successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

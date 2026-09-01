const { notificationsService } = require('../services/notifications.service');

async function getNotifications(req, res, next) {
  try {
    const user = req.user || {
      role: req.query.role || 'admin',
      id: req.query.userId || null,
      sub: req.query.userId || null,
      program: req.query.program || null,
      programCode: req.query.program || null,
      teacherId: req.query.teacherId || null,
    };

    const list = await notificationsService.listNotifications({ user });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

async function createNotification(req, res, next) {
  try {
    const { title, message, type, link, targetRole, targetUserId, targetProgram, targetTeacherId } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const created = await notificationsService.createNotification({
      title,
      message,
      type,
      link,
      targetRole,
      targetUserId,
      targetProgram,
      targetTeacherId,
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.sub || req.body.userId || '1';
    await notificationsService.markNotificationRead(id, userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    const user = req.user || { id: req.body.userId || '1', sub: req.body.userId || '1' };
    await notificationsService.markAllNotificationsRead(user);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function deleteNotification(req, res, next) {
  try {
    const { id } = req.params;
    await notificationsService.deleteNotification(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  notificationsController: {
    getNotifications,
    createNotification,
    markRead,
    markAllRead,
    deleteNotification,
  },
};

const express = require('express');
const { notificationsController } = require('../controllers/notifications.controller');
const jwt = require('jsonwebtoken');

// Soft auth middleware: attaches user if valid token exists, but does not hard-fail public / mock dev calls
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded;
    } catch {
      // ignore invalid token in soft auth
    }
  }
  next();
}

const router = express.Router();

router.get('/', optionalAuth, notificationsController.getNotifications);
router.post('/', optionalAuth, notificationsController.createNotification);
router.patch('/mark-all-read', optionalAuth, notificationsController.markAllRead);
router.patch('/:id/read', optionalAuth, notificationsController.markRead);
router.delete('/:id', optionalAuth, notificationsController.deleteNotification);

module.exports = router;

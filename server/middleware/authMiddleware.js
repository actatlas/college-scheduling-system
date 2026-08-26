const jwt = require('jsonwebtoken');
const { query } = require('../utils/db');

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: 'Missing Bearer token. Please log in again.',
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
    const decoded = jwt.verify(token, jwtSecret);

    // Verify account status in database to immediately invalidate suspended sessions
    const userId = decoded?.sub || decoded?.id;
    if (userId) {
      const rows = await query('SELECT id, role, status FROM users WHERE id = ? LIMIT 1', [userId]);
      const user = rows[0];

      if (!user) {
        return res.status(401).json({
          error: 'User account no longer exists. Please log in again.',
        });
      }

      if (String(user.status || '').trim().toLowerCase() === 'suspended') {
        return res.status(403).json({
          error: 'Your account has been suspended. Please contact the ICT Office or system administrator.',
          code: 'ACCOUNT_SUSPENDED',
        });
      }

      req.user = { ...decoded, sub: user.id, id: user.id, role: user.role, status: user.status || 'Active' };
    } else {
      req.user = decoded;
    }

    return next();
  } catch (e) {
    return res.status(401).json({
      error: 'Invalid or expired token. Please log in again.',
    });
  }
}

module.exports = { authMiddleware };


const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
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
    req.user = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({
      error: 'Invalid or expired token. Please log in again.',
    });
  }
}

module.exports = { authMiddleware };


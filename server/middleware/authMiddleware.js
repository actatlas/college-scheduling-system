const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: { message: 'Missing Bearer token' },
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({
      error: { message: 'Invalid or expired token' },
    });
  }
}

module.exports = { authMiddleware };


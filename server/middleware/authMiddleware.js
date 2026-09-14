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

    // Verify account status and program assignment in database
    const userId = decoded?.sub || decoded?.id;
    if (userId) {
      let user = null;
      try {
        const rows = await query('SELECT id, name, email, role, status, program FROM users WHERE id = ? LIMIT 1', [userId]);
        user = rows[0];
      } catch {
        const rows = await query('SELECT id, name, email, role, status FROM users WHERE id = ? LIMIT 1', [userId]);
        user = rows[0];
      }

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

      let userProg = user.program || decoded?.program || null;
      let userProgCode = user.program || decoded?.programCode || null;
      let userProgs = decoded?.programs || [];

      if (user.role === 'program_head') {
        try {
          const majors = await query('SELECT program_code, code FROM program_majors WHERE program_head_id = ?', [user.id]);
          if (Array.isArray(majors) && majors.length > 0) {
            userProg = userProg || majors[0].code || majors[0].program_code;
            userProgCode = userProgCode || majors[0].program_code || majors[0].code;
            userProgs = majors.map((m) => m.code);
          }
        } catch {
          // ignore
        }
      }

      req.user = {
        ...decoded,
        sub: user.id,
        id: user.id,
        name: user.name || decoded?.name,
        email: user.email || decoded?.email,
        role: user.role,
        status: user.status || 'Active',
        program: userProg,
        programCode: userProgCode,
        programs: userProgs,
      };
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


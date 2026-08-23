const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');
const { notFoundHandler } = require('./middleware/notFoundHandler');

const routes = require('./routes');

function createApp() {
  const app = express();

  app.use(express.json({ limit: '2mb' }));

  app.use(
    cors({
      origin: (origin, cb) => {
        const raw = process.env.CORS_ORIGIN || '*';
        if (!origin || raw === '*') return cb(null, true);
        const allowed = raw.split(',').map((s) => s.trim().toLowerCase());
        const lowerOrigin = origin.toLowerCase();
        if (
          allowed.includes(lowerOrigin) ||
          allowed.includes('*') ||
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
          return cb(null, true);
        }
        return cb(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.get('/health', (req, res) => res.json({ ok: true }));

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };


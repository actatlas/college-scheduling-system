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
        const allowed = raw === '*' ? ['*'] : raw.split(',').map((s) => s.trim());
        if (!origin) return cb(null, true);
        if (allowed.includes('*') || allowed.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  app.get('/health', (req, res) => res.json({ ok: true }));

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };


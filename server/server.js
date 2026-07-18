const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { createApp } = require('./app');
const { testConnection } = require('./database/pool');
const { authService } = require('./services/auth.service');

const app = createApp();

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await testConnection();
    await authService.ensureDefaultUsers();
    // eslint-disable-next-line no-console
    console.log(`[backend] connected to MySQL database ${process.env.DB_NAME || 'srcb_scheduler'}`);
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`[backend] listening on port ${PORT}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[backend] MySQL connection failed:', error.message || error);
    process.exit(1);
  }
}

startServer();


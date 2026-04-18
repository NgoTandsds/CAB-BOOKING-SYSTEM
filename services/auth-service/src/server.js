require('./tracing'); // OpenTelemetry must load first
require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
const { getRedis } = require('./config/redis');

const PORT = process.env.PORT || 3001;

(async () => {
  try {
    await connectDB();
    getRedis();
    app.listen(PORT, () => console.log(`[auth-service] Running on port ${PORT}`));
  } catch (err) {
    console.error('[auth-service] Failed to start:', err.message);
    process.exit(1);
  }
})();

require('./tracing'); // OpenTelemetry must load first
require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 3002;
(async () => {
  try { await connectDB(); app.listen(PORT, () => console.log(`[user-service] Running on port ${PORT}`)); }
  catch (e) { console.error('[user-service] Failed:', e.message); process.exit(1); }
})();

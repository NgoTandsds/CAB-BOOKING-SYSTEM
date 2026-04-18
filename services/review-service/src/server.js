require('./tracing'); // OpenTelemetry must load first
require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 3009;
(async () => {
  try { await connectDB(); app.listen(PORT, () => console.log(`[review-service] Running on port ${PORT}`)); }
  catch (e) { console.error('[review-service] Failed:', e.message); process.exit(1); }
})();

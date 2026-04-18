require('./tracing'); // OpenTelemetry must load first
require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
const producer = require('./events/producer');

const PORT = process.env.PORT || 3004;
(async () => {
  try {
    await connectDB();
    await producer.connect().catch(e => console.warn('[booking-service] Kafka unavailable:', e.message));
    app.listen(PORT, () => console.log(`[booking-service] Running on port ${PORT}`));
  } catch (e) { console.error('[booking-service] Failed:', e.message); process.exit(1); }
})();

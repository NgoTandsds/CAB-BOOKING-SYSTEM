require('./tracing'); // OpenTelemetry must load first
require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
const producer = require('./events/producer');
const consumer = require('./events/consumer');

const PORT = process.env.PORT || 3006;
(async () => {
  try {
    await connectDB();
    await producer.connect().catch(e => console.warn('[payment-service] Kafka producer unavailable:', e.message));
    consumer.start().catch(e => console.warn('[payment-service] Kafka consumer unavailable:', e.message));
    app.listen(PORT, () => console.log(`[payment-service] Running on port ${PORT}`));
  } catch (e) { console.error('[payment-service] Failed:', e.message); process.exit(1); }
})();

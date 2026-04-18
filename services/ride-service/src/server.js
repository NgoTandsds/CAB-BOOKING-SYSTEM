require('./tracing'); // OpenTelemetry must load first
require('dotenv').config();
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const Redis = require('ioredis');
const app = require('./app');
const { connectDB } = require('./config/db');
const producer = require('./events/producer');
const consumer = require('./events/consumer');

const PORT = process.env.PORT || 3005;
const server = http.createServer(app);
const io = new SocketIO(server, { cors: { origin: '*' } });
const redis = new Redis(process.env.REDIS_URL);

// Share io with app and consumer
app.set('io', io);
consumer.setIO(io);

// WebSocket handlers
io.on('connection', (socket) => {
  socket.on('join:customer', (id) => socket.join(`customer:${id}`));
  socket.on('join:ride', (id) => socket.join(`ride:${id}`));
  socket.on('join:driver', (id) => socket.join(`driver:${id}`));
  socket.on('driver:location', async ({ driverId, rideId, latitude, longitude }) => {
    await redis.geoadd('driver:locations', longitude, latitude, driverId);
    io.to(`ride:${rideId}`).emit('driver:location', { driverId, latitude, longitude });
  });
});

(async () => {
  try {
    await connectDB();
    await producer.connect().catch(e => console.warn('[ride-service] Kafka producer unavailable:', e.message));
    consumer.start().catch(e => console.warn('[ride-service] Kafka consumer unavailable:', e.message));
    server.listen(PORT, () => console.log(`[ride-service] Running on port ${PORT}`));
    // Re-match rides stuck in MATCHING from previous sessions (e.g. after docker restart)
    setTimeout(() => consumer.requeueMatchingRides(), 15000);
  } catch (e) { console.error('[ride-service] Failed:', e.message); process.exit(1); }
})();

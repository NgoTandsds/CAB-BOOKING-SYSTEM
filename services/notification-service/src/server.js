require('./tracing'); // OpenTelemetry must load first
require('dotenv').config();
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const app = require('./app');
const { connectDB } = require('./config/db');
const consumer = require('./events/consumer');

const PORT = process.env.PORT || 3008;
const server = http.createServer(app);
const io = new SocketIO(server, { cors: { origin: '*' } });
consumer.setIO(io);

io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(`user:${userId}`));
});

(async () => {
  try {
    await connectDB();
    consumer.start().catch(e => console.warn('[notification-service] Kafka unavailable:', e.message));
    server.listen(PORT, () => console.log(`[notification-service] Running on port ${PORT}`));
  } catch (e) { console.error('[notification-service] Failed:', e.message); process.exit(1); }
})();

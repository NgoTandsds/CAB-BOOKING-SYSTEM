require('./tracing'); // OpenTelemetry must load first
require('dotenv').config();
const http = require('http');
const app = require('./app');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

server.listen(PORT, () => console.log(`[api-gateway] Running on port ${PORT}`));

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });

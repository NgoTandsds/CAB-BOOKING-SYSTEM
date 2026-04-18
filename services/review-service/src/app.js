const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const { v4: uuidv4 } = require('uuid');
const reviewRoutes = require('./routes/review.routes');

const client = require('prom-client');
const app = express();
app.use(helmet()); app.use(cors()); app.use(pinoHttp({
  level: process.env.LOG_LEVEL || 'info',
  autoLogging: true,
  genReqId: (req) => req.headers['x-request-id'] || uuidv4(),
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req) { return { method: req.method, url: req.url, reqId: req.id }; },
    res(res) { return { statusCode: res.statusCode }; },
  },
  base: { service: 'review-service' },
})); app.use(express.json());

const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds', help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'], registers: [register],
});
app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => end({ method: req.method, route: req.path, status_code: res.statusCode }));
  next();
});
app.get('/metrics', async (req, res) => { res.set('Content-Type', register.contentType); res.end(await register.metrics()); });
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'review-service' }));
app.use('/', reviewRoutes);
module.exports = app;

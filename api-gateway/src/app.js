const express = require('express');
const proxy = require('express-http-proxy');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const client = require('prom-client');
const authMiddleware = require('./middlewares/auth');
const rbac = require('./middlewares/rbac');

const app = express();

// ─── Security & Utility Middleware ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization','Idempotency-Key','X-Idempotency-Key','X-Request-ID'] }));
app.use(pinoHttp({
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
  base: { service: 'api-gateway' },
}));
app.use(express.json());

// Prometheus metrics
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

// Global rate limiter
app.use(rateLimit({ windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' } }));

// Auth rate limiter (stricter)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again later' } });

// ─── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});
app.get('/metrics', async (req, res) => { res.set('Content-Type', register.contentType); res.end(await register.metrics()); });

// ─── Zero Trust: verify JWT on every request ──────────────────────────────────
app.use(authMiddleware);

// ─── Proxy helper (express-http-proxy style from PDF) ─────────────────────────
function makeProxy(target) {
  return proxy(target, {
    proxyErrorHandler: (err, res, next) => {
      console.error(`[api-gateway] Proxy error → ${target}:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({ success: false, message: 'Service temporarily unavailable' });
      }
    },
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth',          authLimiter, makeProxy(process.env.AUTH_SERVICE_URL));
app.use('/users',         makeProxy(process.env.USER_SERVICE_URL));
app.use('/drivers',       makeProxy(process.env.DRIVER_SERVICE_URL));
app.use('/bookings',      makeProxy(process.env.BOOKING_SERVICE_URL));
app.use('/rides',         makeProxy(process.env.RIDE_SERVICE_URL));
app.use('/payments',      makeProxy(process.env.PAYMENT_SERVICE_URL));
app.use('/pricing',       makeProxy(process.env.PRICING_SERVICE_URL));
app.use('/notifications', makeProxy(process.env.NOTIFICATION_SERVICE_URL));
app.use('/reviews',       makeProxy(process.env.REVIEW_SERVICE_URL));

// ─── 404 & Error Handler ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` }));
app.use((err, req, res, next) => res.status(500).json({ success: false, message: 'Internal gateway error' }));

module.exports = app;

/**
 * Structured JSON logger factory using pino.
 * Each service creates its own logger:
 *   const { createLogger } = require('./utils/logger');
 *   const logger = createLogger('auth-service');
 *   logger.info({ userId }, 'User registered');
 */
const pino = require('pino');

function createLogger(serviceName) {
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    base: { service: serviceName, pid: process.pid },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) { return { level: label }; },
    },
    redact: {
      paths: ['*.password', '*.token', '*.accessToken', '*.refreshToken', '*.secret'],
      censor: '[REDACTED]',
    },
  });
}

module.exports = { createLogger };

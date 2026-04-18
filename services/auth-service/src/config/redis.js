const Redis = require('ioredis');

let redis;
function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: 3,
    });
    redis.on('connect', () => console.log('[auth-service] Redis connected'));
    redis.on('error', (err) => console.error('[auth-service] Redis error:', err.message));
  }
  return redis;
}

module.exports = { getRedis };

const Redis = require('ioredis');
let redis;
module.exports = () => {
  if (!redis) { redis = new Redis(process.env.REDIS_URL); redis.on('error', e => console.error('[pricing-service] Redis error:', e.message)); }
  return redis;
};

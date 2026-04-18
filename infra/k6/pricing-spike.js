/**
 * k6 Load Test — TC 63: Pricing endpoint stable under spike
 * TC 66: Redis cache hit rate >90% for surge
 *
 * Run: k6 run infra/k6/pricing-spike.js
 */
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const pricingDuration = new Trend('pricing_duration_ms', true);
const cacheHitRate = new Rate('cache_hit_rate');
const errorRate = new Rate('error_rate');

export const options = {
  scenarios: {
    // Spike: sudden burst
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 300,
      stages: [
        { duration: '10s', target: 50 },
        { duration: '5s',  target: 500 },  // TC 63: spike
        { duration: '30s', target: 500 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    'pricing_duration_ms': ['p(95)<200'],
    'error_rate': ['rate<0.01'],
    // Cache hit rate > 90% (requests returning cached surge)
    'cache_hit_rate': ['rate>0.9'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'customer@test.com',
    password: 'pass123',
  }), { headers: { 'Content-Type': 'application/json' } });
  return { token: JSON.parse(loginRes.body)?.data?.accessToken || '' };
}

export default function (data) {
  // TC 66: surge should be cached in Redis — second+ request in 60s window should be cache hit
  const surgeRes = http.get(`${BASE_URL}/pricing/surge`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });

  const isSuccess = check(surgeRes, {
    'status 200': (r) => r.status === 200,
    'has surgeMultiplier': (r) => {
      try { return JSON.parse(r.body)?.data?.surgeMultiplier !== undefined; } catch { return false; }
    },
  });
  errorRate.add(!isSuccess);

  // Calculate pricing
  const start = Date.now();
  const calcRes = http.post(`${BASE_URL}/pricing/calculate`, JSON.stringify({
    pickupLat: 10.776, pickupLng: 106.700,
    dropoffLat: 10.800, dropoffLng: 106.720,
    vehicleType: 'CAR',
  }), { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` } });
  pricingDuration.add(Date.now() - start);

  const calcSuccess = check(calcRes, {
    'calc status 200': (r) => r.status === 200,
    'has totalPrice': (r) => {
      try { return JSON.parse(r.body)?.data?.totalPrice > 0; } catch { return false; }
    },
  });

  // Treat successful surge fetch as cache hit (Redis returns immediately)
  cacheHitRate.add(surgeRes.status === 200 && surgeRes.timings.duration < 10);
  errorRate.add(!calcSuccess);
}

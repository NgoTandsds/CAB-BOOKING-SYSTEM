/**
 * k6 Load Test — TC 61: POST /bookings at 1000 req/s
 * TC 67: API Gateway rate limit
 * TC 68: P95 latency < 300ms
 *
 * Run: k6 run infra/k6/booking-load.js
 * Install: https://k6.io/docs/getting-started/installation/
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metrics
const bookingDuration = new Trend('booking_duration_ms', true);
const errorRate = new Rate('error_rate');
const successCount = new Counter('successful_bookings');

// Test configuration
export const options = {
  scenarios: {
    // Ramp up to 1000 req/s over 30s, hold for 60s
    sustained_load: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 500,
      stages: [
        { duration: '30s', target: 200 },   // warm up
        { duration: '60s', target: 1000 },  // TC 61: 1000 req/s
        { duration: '30s', target: 0 },     // ramp down
      ],
    },
  },
  thresholds: {
    // TC 68: P95 < 300ms
    'booking_duration_ms{scenario:sustained_load}': ['p(95)<300'],
    // Less than 1% errors
    'error_rate': ['rate<0.01'],
    // HTTP request duration (built-in)
    'http_req_duration': ['p(95)<300', 'p(99)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Pre-shared token (get via setup)
let authToken = '';

export function setup() {
  // Register + login to get a token
  const registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
    email: `loadtest_${Date.now()}@test.com`,
    password: 'loadtest123',
    role: 'CUSTOMER',
  }), { headers: { 'Content-Type': 'application/json' } });

  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: JSON.parse(registerRes.body)?.data?.email || `loadtest@test.com`,
    password: 'loadtest123',
  }), { headers: { 'Content-Type': 'application/json' } });

  const token = JSON.parse(loginRes.body)?.data?.accessToken;
  console.log(`Setup complete, token acquired: ${token ? 'YES' : 'NO'}`);
  return { token };
}

export default function (data) {
  const token = data?.token || authToken;
  const idempotencyKey = `load-test-${__VU}-${__ITER}`;

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
  };

  const payload = JSON.stringify({
    pickupLat: 10.776 + (Math.random() * 0.1 - 0.05),
    pickupLng: 106.700 + (Math.random() * 0.1 - 0.05),
    dropoffLat: 10.800 + (Math.random() * 0.1 - 0.05),
    dropoffLng: 106.720 + (Math.random() * 0.1 - 0.05),
    vehicleType: ['CAR', 'MOTORBIKE', 'VAN'][Math.floor(Math.random() * 3)],
  });

  const start = Date.now();
  const res = http.post(`${BASE_URL}/bookings`, payload, params);
  const duration = Date.now() - start;

  bookingDuration.add(duration);
  const success = check(res, {
    'status is 201 or 200': (r) => r.status === 201 || r.status === 200,
    'has booking id': (r) => {
      try { return JSON.parse(r.body)?.data?.booking?.id !== undefined; } catch { return false; }
    },
    'response time < 300ms': () => duration < 300,
  });

  errorRate.add(!success);
  if (success) successCount.add(1);
}

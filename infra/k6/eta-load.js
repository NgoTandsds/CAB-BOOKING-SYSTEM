/**
 * k6 Load Test — TC 62: ETA calculation responds under load
 *
 * Run: k6 run infra/k6/eta-load.js
 */
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const etaDuration = new Trend('eta_duration_ms', true);
const errorRate = new Rate('error_rate');

export const options = {
  stages: [
    { duration: '20s', target: 50 },
    { duration: '60s', target: 200 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    'eta_duration_ms': ['p(95)<300'],
    'error_rate': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'driver@test.com', password: 'pass123',
  }), { headers: { 'Content-Type': 'application/json' } });
  return { token: JSON.parse(loginRes.body)?.data?.accessToken || '' };
}

export default function (data) {
  // GET /rides/:id simulates ETA retrieval
  const start = Date.now();
  const res = http.get(`${BASE_URL}/rides`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  etaDuration.add(Date.now() - start);

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'response time < 300ms': () => Date.now() - start < 300,
  });
  errorRate.add(!ok);
}

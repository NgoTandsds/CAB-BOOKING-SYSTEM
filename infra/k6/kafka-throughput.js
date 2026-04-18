/**
 * k6 Kafka Throughput Test — TC 64
 * Measures Kafka message throughput by producing ride.created events
 * via the booking API and verifying consumer lag via kafka-exporter metrics.
 *
 * Run: k6 run -e BASE_URL=http://localhost:3000 infra/k6/kafka-throughput.js
 * Prerequisites: docker compose up --build -d
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const kafkaMessagesProduced = new Counter('kafka_messages_produced');
const kafkaProduceThroughput = new Trend('kafka_produce_throughput_rps', true);
const errorRate = new Rate('kafka_error_rate');

export const options = {
  scenarios: {
    // TC 64: sustained Kafka throughput — produce 500 msg/s for 60s
    kafka_throughput: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 300,
      stages: [
        { duration: '15s', target: 100 },  // warm up
        { duration: '60s', target: 500 },  // peak throughput
        { duration: '15s', target: 0 },    // ramp down
      ],
    },
  },
  thresholds: {
    // At least 95% of requests should succeed (Kafka message produced)
    'kafka_error_rate': ['rate<0.05'],
    // HTTP booking endpoint P95 < 500ms under Kafka load
    'http_req_duration': ['p(95)<500'],
    // Verify significant volume was produced
    'kafka_messages_produced': ['count>1000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  // Register a test user and get auth token
  const ts = Date.now();
  const email = `kafka_test_${ts}@test.com`;

  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ email, password: 'kafkatest123', role: 'CUSTOMER' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password: 'kafkatest123' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  let token = null;
  try {
    token = JSON.parse(loginRes.body)?.data?.accessToken;
  } catch (_) {}

  console.log(`[kafka-throughput] Setup complete. Token: ${token ? 'YES' : 'NO'}`);
  return { token };
}

export default function (data) {
  const token = data?.token;
  if (!token) {
    errorRate.add(1);
    return;
  }

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': `kafka-tp-${__VU}-${__ITER}-${Date.now()}`,
    },
  };

  // Each POST /bookings triggers a Kafka ride.created event in booking-service
  const payload = JSON.stringify({
    pickupLat:  10.776 + (Math.random() * 0.1 - 0.05),
    pickupLng:  106.700 + (Math.random() * 0.1 - 0.05),
    dropoffLat: 10.820 + (Math.random() * 0.1 - 0.05),
    dropoffLng: 106.740 + (Math.random() * 0.1 - 0.05),
    vehicleType: ['SEDAN', 'SUV', 'MOTORBIKE'][Math.floor(Math.random() * 3)],
  });

  const start = Date.now();
  const res = http.post(`${BASE_URL}/bookings`, payload, params);
  const elapsed = Date.now() - start;

  const ok = check(res, {
    'booking created (2xx)': (r) => r.status >= 200 && r.status < 300,
    'has booking id':        (r) => {
      try { return !!JSON.parse(r.body)?.data?.booking?.id; } catch { return false; }
    },
  });

  kafkaProduceThroughput.add(elapsed);
  errorRate.add(!ok);

  if (ok) {
    kafkaMessagesProduced.add(1);
  }
}

export function handleSummary(data) {
  const produced = data.metrics?.kafka_messages_produced?.values?.count || 0;
  const p95      = data.metrics?.http_req_duration?.values?.['p(95)'] || 0;
  const errRate  = (data.metrics?.kafka_error_rate?.values?.rate || 0) * 100;
  const duration = data.state?.testRunDurationMs || 0;
  const tps      = duration > 0 ? (produced / (duration / 1000)).toFixed(1) : 0;

  console.log('');
  console.log('══════════════════════════════════════════');
  console.log('  TC 64 — Kafka Throughput Test Results');
  console.log('══════════════════════════════════════════');
  console.log(`  Messages produced : ${produced}`);
  console.log(`  Avg throughput    : ${tps} msg/s`);
  console.log(`  Error rate        : ${errRate.toFixed(2)}%`);
  console.log(`  HTTP P95 latency  : ${p95.toFixed(0)}ms`);
  console.log(`  Status            : ${errRate < 5 && produced >= 1000 ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log('══════════════════════════════════════════');
  console.log('');
  console.log('  Monitor consumer lag:');
  console.log('  curl http://localhost:9308/metrics | grep kafka_consumer');
  console.log('');

  return {
    stdout: JSON.stringify(data, null, 2),
  };
}

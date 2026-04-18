# k6 Load Tests

## Install k6
```bash
# macOS
brew install k6

# Windows (choco)
choco install k6

# Docker
docker pull grafana/k6
```

## Run Tests

### TC 61, 68: Booking endpoint 1000 req/s + P95 < 300ms
```bash
k6 run infra/k6/booking-load.js

# Or with Docker
docker run --rm -i -e BASE_URL=http://host.docker.internal:3000 grafana/k6 run - < infra/k6/booking-load.js
```

### TC 63, 66: Pricing spike + cache hit rate
```bash
k6 run infra/k6/pricing-spike.js
```

### TC 62: ETA under load
```bash
k6 run infra/k6/eta-load.js
```

## Override Target URL
```bash
k6 run -e BASE_URL=http://localhost:3000 infra/k6/booking-load.js
```

## Expected Results (Passing)
| Test Case | Metric | Threshold |
|-----------|--------|-----------|
| TC 61 | Throughput | 1000 req/s sustained |
| TC 62 | ETA P95 | < 300ms |
| TC 63 | Pricing P95 | < 200ms |
| TC 66 | Cache hit rate | > 90% |
| TC 67 | Rate limit | > 200 req/min → 429 |
| TC 68 | P95 latency | < 300ms |

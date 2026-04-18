/**
 * Auth Service — Integration Tests
 * Uses supertest against the real Express app.
 * Requires: TEST_DB_* env vars or in-memory mocks.
 *
 * Run: cd services/auth-service && npm test
 */

// Suppress tracing in tests
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = '';
jest.mock('../src/tracing', () => {}, { virtual: true });

const request = require('supertest');

// ─── Mock DB and Redis ────────────────────────────────────────────────────────
// We mock the repositories and Redis so tests run without live infrastructure.

const mockUsers = new Map();
let uidCounter = 1;

jest.mock('../src/repositories/user.repo', () => ({
  findByEmail: jest.fn((email) => {
    for (const u of mockUsers.values()) {
      if (u.email === email) return Promise.resolve(u);
    }
    return Promise.resolve(null);
  }),
  createUser: jest.fn(({ email, password, role }) => {
    const user = { id: `u-${uidCounter++}`, email, password, role, isActive: true, refreshToken: null };
    mockUsers.set(user.id, user);
    return Promise.resolve(user);
  }),
  findById: jest.fn((id) => Promise.resolve(mockUsers.get(id) || null)),
  updateRefreshToken: jest.fn((id, token) => {
    const u = mockUsers.get(id);
    if (u) u.refreshToken = token;
    return Promise.resolve();
  }),
  clearRefreshToken: jest.fn((id) => {
    const u = mockUsers.get(id);
    if (u) u.refreshToken = null;
    return Promise.resolve();
  }),
}));

const redisStore = new Map();
jest.mock('../src/config/redis', () => ({
  getRedis: jest.fn(() => ({
    setex: jest.fn((k, ttl, v) => { redisStore.set(k, v); return Promise.resolve(); }),
    get: jest.fn((k) => Promise.resolve(redisStore.get(k) || null)),
    del: jest.fn((k) => { redisStore.delete(k); return Promise.resolve(); }),
  })),
}));

// ─── Load app after mocks are set up ─────────────────────────────────────────
process.env.JWT_SECRET = 'test-secret-for-jest-only';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';

let app;
beforeAll(() => {
  app = require('../src/app');
});

beforeEach(() => {
  mockUsers.clear();
  redisStore.clear();
  uidCounter = 1;
  jest.clearAllMocks();
  // Re-bind mocks since map was cleared
  const repo = require('../src/repositories/user.repo');
  repo.findByEmail.mockImplementation((email) => {
    for (const u of mockUsers.values()) {
      if (u.email === email) return Promise.resolve(u);
    }
    return Promise.resolve(null);
  });
  repo.createUser.mockImplementation(({ email, password, role }) => {
    const user = { id: `u-${uidCounter++}`, email, password, role, isActive: true, refreshToken: null };
    mockUsers.set(user.id, user);
    return Promise.resolve(user);
  });
  repo.findById.mockImplementation((id) => Promise.resolve(mockUsers.get(id) || null));
  repo.updateRefreshToken.mockImplementation((id, token) => {
    const u = mockUsers.get(id);
    if (u) u.refreshToken = token;
    return Promise.resolve();
  });
  repo.clearRefreshToken.mockImplementation((id) => {
    const u = mockUsers.get(id);
    if (u) u.refreshToken = null;
    return Promise.resolve();
  });
  const { getRedis } = require('../src/config/redis');
  getRedis.mockReturnValue({
    setex: jest.fn((k, ttl, v) => { redisStore.set(k, v); return Promise.resolve(); }),
    get: jest.fn((k) => Promise.resolve(redisStore.get(k) || null)),
    del: jest.fn((k) => { redisStore.delete(k); return Promise.resolve(); }),
  });
});

// ─── Test Helpers ─────────────────────────────────────────────────────────────
const VALID_USER = { email: 'test@example.com', password: 'SecurePass123', role: 'CUSTOMER' };

async function registerUser(overrides = {}) {
  return request(app).post('/register').send({ ...VALID_USER, ...overrides });
}

async function loginUser(overrides = {}) {
  return request(app).post('/login').send({
    email: VALID_USER.email,
    password: VALID_USER.password,
    ...overrides,
  });
}

// ─── TC 1: Register ───────────────────────────────────────────────────────────
describe('POST /register', () => {
  test('TC-1a: Valid registration → 201 + tokens + user object', async () => {
    const res = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user).toHaveProperty('id');
    expect(res.body.data.user.email).toBe(VALID_USER.email);
    expect(res.body.data.user.role).toBe('CUSTOMER');
  });

  test('TC-12: Duplicate email → 409', async () => {
    await registerUser();
    const res = await registerUser();
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already registered/i);
  });

  test('TC-11: Invalid email format → 422', async () => {
    const res = await registerUser({ email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  test('TC-11b: Missing password → 422', async () => {
    const res = await registerUser({ password: '' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  test('TC-11c: Missing email → 422', async () => {
    const res = await registerUser({ email: undefined });
    expect(res.status).toBe(422);
  });

  test('DRIVER role registration succeeds', async () => {
    const res = await registerUser({ email: 'driver@example.com', role: 'DRIVER' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('DRIVER');
  });
});

// ─── TC 2: Login ──────────────────────────────────────────────────────────────
describe('POST /login', () => {
  beforeEach(async () => {
    await registerUser(); // create the user first
  });

  test('TC-2: Valid login → 200 + JWT (exp, sub readable)', async () => {
    const res = await loginUser();
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');

    // Verify JWT structure
    const [, payloadB64] = res.body.data.accessToken.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
    expect(payload).toHaveProperty('userId');
    expect(payload).toHaveProperty('email');
    expect(payload).toHaveProperty('exp');
  });

  test('TC-13: Wrong password → 401', async () => {
    const res = await loginUser({ password: 'WrongPassword!' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('Non-existent email → 401', async () => {
    const res = await loginUser({ email: 'nobody@example.com' });
    expect(res.status).toBe(401);
  });

  test('Missing password → 422', async () => {
    const res = await loginUser({ password: '' });
    expect(res.status).toBe(422);
  });
});

// ─── TC 21: GET /me ───────────────────────────────────────────────────────────
describe('GET /me', () => {
  test('TC-21: Valid token → 200 + user profile', async () => {
    const regRes = await registerUser();
    const token = regRes.body.data.accessToken;

    const res = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${token}`)
      .set('x-user-id', regRes.body.data.user.id);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('email', VALID_USER.email);
  });

  test('No token → 401', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
  });
});

// ─── Logout / Token Blacklist ─────────────────────────────────────────────────
describe('POST /logout', () => {
  test('TC-15: Logout blacklists token → subsequent /me fails with 401', async () => {
    const regRes = await registerUser();
    const { accessToken, user } = regRes.body.data;

    // Logout
    const logoutRes = await request(app)
      .post('/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-user-id', user.id);
    expect(logoutRes.status).toBe(200);

    // Verify token is blacklisted via /verify
    const verifyRes = await request(app)
      .get('/verify')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(verifyRes.status).toBe(401);
  });
});

// ─── Refresh Token ────────────────────────────────────────────────────────────
describe('POST /refresh', () => {
  test('Valid refresh token → new access + refresh tokens', async () => {
    const regRes = await registerUser();
    const { refreshToken } = regRes.body.data;

    const res = await request(app)
      .post('/refresh')
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    // New tokens should differ from old ones
    expect(res.body.data.accessToken).not.toBe(regRes.body.data.accessToken);
  });

  test('Invalid refresh token → 401', async () => {
    const res = await request(app)
      .post('/refresh')
      .send({ refreshToken: 'bad.token.here' });
    expect(res.status).toBe(401);
  });
});

// ─── Health ───────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  test('Returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ─── Metrics ─────────────────────────────────────────────────────────────────
describe('GET /metrics', () => {
  test('TC-113: Returns Prometheus text format', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('# HELP');
    expect(res.text).toContain('nodejs_heap_size_used_bytes');
  });
});

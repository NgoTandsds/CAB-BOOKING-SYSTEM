const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepo = require('../repositories/user.repo');
const { getRedis } = require('../config/redis');

const REFRESH_TTL_SEC = 7 * 24 * 60 * 60;

const generateToken = (payload, expiresIn) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

exports.register = async ({ email, password, role }) => {
  const existing = await userRepo.findByEmail(email);
  if (existing) { const e = new Error('Email already registered'); e.status = 409; throw e; }

  const hashed = await bcrypt.hash(password, 10);
  const user = await userRepo.createUser({ email, password: hashed, role });

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = generateToken(payload, process.env.JWT_EXPIRES_IN || '15m');
  const refreshToken = generateToken({ userId: user.id }, process.env.REFRESH_TOKEN_EXPIRES_IN || '7d');

  await userRepo.updateRefreshToken(user.id, refreshToken);
  await getRedis().setex(`refresh:${user.id}`, REFRESH_TTL_SEC, refreshToken);

  return { user: { id: user.id, email: user.email, role: user.role }, accessToken, refreshToken };
};

exports.login = async ({ email, password }) => {
  const user = await userRepo.findByEmail(email);
  if (!user || !user.isActive) { const e = new Error('Invalid credentials'); e.status = 401; throw e; }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) { const e = new Error('Invalid credentials'); e.status = 401; throw e; }

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = generateToken(payload, process.env.JWT_EXPIRES_IN || '15m');
  const refreshToken = generateToken({ userId: user.id }, process.env.REFRESH_TOKEN_EXPIRES_IN || '7d');

  await userRepo.updateRefreshToken(user.id, refreshToken);
  await getRedis().setex(`refresh:${user.id}`, REFRESH_TTL_SEC, refreshToken);

  return { user: { id: user.id, email: user.email, role: user.role }, accessToken, refreshToken };
};

exports.refreshToken = async (token) => {
  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
  catch { const e = new Error('Invalid or expired refresh token'); e.status = 401; throw e; }

  const stored = await getRedis().get(`refresh:${decoded.userId}`);
  if (!stored || stored !== token) { const e = new Error('Refresh token mismatch'); e.status = 401; throw e; }

  const user = await userRepo.findById(decoded.userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }

  const payload = { userId: user.id, email: user.email, role: user.role };
  const newAccessToken = generateToken(payload, process.env.JWT_EXPIRES_IN || '15m');
  const newRefreshToken = generateToken({ userId: user.id }, process.env.REFRESH_TOKEN_EXPIRES_IN || '7d');

  await userRepo.updateRefreshToken(user.id, newRefreshToken);
  await getRedis().setex(`refresh:${user.id}`, REFRESH_TTL_SEC, newRefreshToken);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

exports.logout = async (userId, accessToken) => {
  await getRedis().setex(`blacklist:${accessToken}`, 900, '1');
  await getRedis().del(`refresh:${userId}`);
  await userRepo.clearRefreshToken(userId);
};

exports.verifyToken = async (token) => {
  const isBlacklisted = await getRedis().get(`blacklist:${token}`);
  if (isBlacklisted) { const e = new Error('Token revoked'); e.status = 401; throw e; }
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { const e = new Error('Invalid token'); e.status = 401; throw e; }
};

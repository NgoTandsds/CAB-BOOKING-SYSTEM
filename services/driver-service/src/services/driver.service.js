const driverRepo = require('../repositories/driver.repo');
const Redis = require('ioredis');
const producer = require('../events/producer');
const axios = require('axios');

const redis = new Redis(process.env.REDIS_URL);

exports.register = async (authId, data) => {
  const existing = await driverRepo.findByAuthId(authId);
  if (existing) { const e = new Error('Driver profile already exists'); e.status = 409; throw e; }
  return driverRepo.create({ ...data, authId });
};

exports.getMe = async (authId) => {
  const driver = await driverRepo.findByAuthId(authId);
  if (!driver) { const e = new Error('Driver not found'); e.status = 404; throw e; }
  return driver;
};

exports.updateLocation = async (authId, latitude, longitude) => {
  const driver = await driverRepo.findByAuthId(authId);
  if (!driver) { const e = new Error('Driver not found'); e.status = 404; throw e; }
  await driverRepo.update(authId, { latitude, longitude });
  // Store in Redis GEO
  await redis.geoadd('driver:locations', longitude, latitude, driver.id);
  // Publish event
  await producer.publish('driver.location.updated', { driverId: driver.id, latitude, longitude, timestamp: new Date().toISOString() });
  return { latitude, longitude };
};

exports.setAvailability = async (authId, isAvailable) => {
  const driver = await driverRepo.findByAuthId(authId);
  if (!driver) { const e = new Error('Driver not found'); e.status = 404; throw e; }
  const status = isAvailable ? 'AVAILABLE' : 'OFFLINE';
  await driverRepo.update(authId, { isAvailable, status });
  // When driver goes online, trigger ride-service to re-match pending rides
  if (isAvailable) {
    axios.post('http://ride-service:3005/internal/requeue', {}, { timeout: 3000 })
      .catch(() => {});
  }
  return { isAvailable, status };
};

exports.getNearby = async (lat, lng) => driverRepo.findAvailableNearby(parseFloat(lat), parseFloat(lng));

exports.getById = async (id) => {
  const driver = await driverRepo.findById(id);
  if (!driver) { const e = new Error('Driver not found'); e.status = 404; throw e; }
  return driver;
};

exports.setAvailabilityById = async (id, isAvailable) => {
  const driver = await driverRepo.findById(id);
  if (!driver) { const e = new Error('Driver not found'); e.status = 404; throw e; }
  const status = isAvailable ? 'AVAILABLE' : 'ON_RIDE';
  await driverRepo.updateById(id, { isAvailable, status });
  return { isAvailable, status };
};

exports.getAll = () => driverRepo.findAll();

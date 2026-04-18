const { Kafka } = require('kafkajs');
const Redis = require('ioredis');
const rideRepo = require('../repositories/ride.repo');
const { findBestDriver } = require('../modules/matching');
const { calculateETA } = require('../modules/eta');
const producer = require('./producer');
const axios = require('axios');

let redis;
const getRedis = () => {
  if (!redis) redis = new Redis(process.env.REDIS_URL);
  return redis;
};

const kafka = new Kafka({ clientId: 'ride-service-consumer', brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','), retry: { retries: 5 } });

let io;
exports.setIO = (socketIO) => { io = socketIO; };

async function withRetry(fn, label, maxAttempts = 4, baseDelay = 500) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt === maxAttempts) throw e;
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`[ride-service] ${label} attempt ${attempt} failed (${e.message}), retrying in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function matchDriver(ride) {
  let bestMatch = null;
  try {
    const drivers = await withRetry(
      () => axios.get(`http://driver-service:3003/nearby?lat=${ride.pickupLat}&lng=${ride.pickupLng}`, { timeout: 5000 }),
      'fetchNearbyDrivers'
    );
    bestMatch = await findBestDriver(
      { latitude: ride.pickupLat, longitude: ride.pickupLng },
      ride.vehicleType,
      drivers.data?.data || []
    );
  } catch (e) { console.warn('[ride-service] Driver fetch failed after retries:', e.message); }

  if (bestMatch && bestMatch.driver) {
    const driver = bestMatch.driver;

    // TC 59: Redis distributed lock — prevent double-assignment of same driver
    const lockKey = `driver:lock:${driver.authId}`;
    let lockAcquired = false;
    try {
      const result = await getRedis().set(lockKey, ride.id, 'NX', 'EX', 30);
      lockAcquired = result === 'OK';
    } catch (e) {
      console.warn('[ride-service] Redis lock unavailable, proceeding without lock:', e.message);
      lockAcquired = true; // degrade gracefully if Redis is down
    }

    if (!lockAcquired) {
      console.warn(`[ride-service] Driver ${driver.authId} already locked by another ride — skipping assignment for ride ${ride.id}`);
      return;
    }

    let etaResult = { etaMinutes: 5 };
    try {
      etaResult = await calculateETA(
        { latitude: driver.latitude, longitude: driver.longitude, vehicleType: driver.vehicleType },
        { latitude: ride.pickupLat, longitude: ride.pickupLng }
      );
    } catch {}

    // Store authId as driverId so ride-service GET /rides can match x-user-id (which is authId from JWT)
    await rideRepo.update(ride.id, {
      driverId: driver.authId, status: 'ASSIGNED',
      etaMinutes: etaResult.etaMinutes,
      driverLat: driver.latitude, driverLng: driver.longitude,
    });

    // Mark driver as busy so they don't get double-booked (use driver-service UUID for internal call)
    await axios.patch(
      `http://driver-service:3003/internal/auth/${driver.authId}/available`,
      { isAvailable: false },
      { timeout: 3000 }
    ).catch(e => console.warn('[ride-service] Failed to mark driver busy:', e.message));

    // TC 59: Release Redis lock — driver is now marked busy in DB, lock no longer needed
    getRedis().del(lockKey).catch(() => {});

    await producer.publish('ride.assigned', {
      rideId: ride.id, bookingId: ride.bookingId, customerId: ride.customerId,
      driverId: driver.authId, driverName: driver.name, etaMinutes: etaResult.etaMinutes,
      timestamp: new Date().toISOString(),
    });

    if (io) io.to(`customer:${ride.customerId}`).emit('ride:assigned', {
      rideId: ride.id, driverId: driver.authId, etaMinutes: etaResult.etaMinutes,
    });
    if (io) io.to(`driver:${driver.authId}`).emit('ride:request', {
      rideId: ride.id, bookingId: ride.bookingId,
      pickupLat: ride.pickupLat, pickupLng: ride.pickupLng,
      dropoffLat: ride.dropoffLat, dropoffLng: ride.dropoffLng,
      estimatedPrice: ride.estimatedPrice,
    });
  }
}

async function handleRideCreated(data) {
  try {
    const ride = await rideRepo.create({
      bookingId: data.bookingId, customerId: data.customerId,
      pickupLat: data.pickupLat, pickupLng: data.pickupLng,
      dropoffLat: data.dropoffLat, dropoffLng: data.dropoffLng,
      vehicleType: data.vehicleType, estimatedPrice: data.estimatedPrice,
      status: 'MATCHING',
    });
    await matchDriver(ride);
  } catch (e) { console.error('[ride-service] handleRideCreated error:', e.message); }
}

async function handleBookingCancelled(data) {
  try {
    const ride = await rideRepo.findByBookingId(data.bookingId);
    if (!ride) return;
    if (['CANCELLED', 'COMPLETED', 'PAID'].includes(ride.status)) return;
    if (ride.driverId) {
      await axios.patch(
        `http://driver-service:3003/internal/auth/${ride.driverId}/available`,
        { isAvailable: true },
        { timeout: 3000 }
      ).catch(e => console.warn('[ride-service] Failed to release driver:', e.message));
    }
    await rideRepo.update(ride.id, { status: 'CANCELLED' });
  } catch (e) { console.error('[ride-service] handleBookingCancelled error:', e.message); }
}

async function handlePaymentCompleted(data) {
  if (!data.rideId) return;
  const ride = await rideRepo.findById(data.rideId);
  if (ride && ride.driverId) {
    await axios.patch(
      `http://driver-service:3003/internal/auth/${ride.driverId}/available`,
      { isAvailable: true },
      { timeout: 3000 }
    ).catch(e => console.warn('[ride-service] Failed to release driver after payment:', e.message));
  }
  await rideRepo.update(data.rideId, { status: 'PAID' });
  if (io) io.to(`ride:${data.rideId}`).emit('ride:paid', { rideId: data.rideId });
}

async function handlePaymentFailed(data) {
  if (!data.rideId) return;
  if (io) io.to(`ride:${data.rideId}`).emit('ride:payment_failed', { rideId: data.rideId });
}

exports.start = async () => {
  const consumer = kafka.consumer({ groupId: 'ride-service-group' });
  await consumer.connect();
  await consumer.subscribe({
    topics: ['ride.created', 'booking.cancelled', 'payment.completed', 'payment.failed'],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const data = JSON.parse(message.value.toString());
      if (topic === 'ride.created') await handleRideCreated(data);
      else if (topic === 'booking.cancelled') await handleBookingCancelled(data);
      else if (topic === 'payment.completed') await handlePaymentCompleted(data);
      else if (topic === 'payment.failed') await handlePaymentFailed(data);
    },
  });
  console.log('[ride-service] Kafka consumer started');
};

// Called on startup to re-match any rides left in MATCHING state from previous sessions
exports.requeueMatchingRides = async () => {
  try {
    const rides = await rideRepo.findByStatus('MATCHING');
    if (rides.length === 0) return;
    console.log(`[ride-service] Re-queuing ${rides.length} MATCHING ride(s) from previous session`);
    for (const ride of rides) {
      await matchDriver(ride);
    }
  } catch (e) { console.error('[ride-service] requeueMatchingRides error:', e.message); }
};

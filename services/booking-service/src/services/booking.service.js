const bookingRepo = require('../repositories/booking.repo');
const producer = require('../events/producer');
const axios = require('axios');
const CircuitBreaker = require('opossum');

// Circuit breaker for pricing-service calls
const pricingCall = (data) =>
  axios.post(`${process.env.PRICING_SERVICE_URL}/calculate`, {
    pickupLat: data.pickupLat, pickupLng: data.pickupLng,
    dropoffLat: data.dropoffLat, dropoffLng: data.dropoffLng,
    vehicleType: data.vehicleType,
  }, { timeout: 3000 });

const pricingBreaker = new CircuitBreaker(pricingCall, {
  timeout: 3000,         // fail if >3s
  errorThresholdPercentage: 50, // open if >50% fail
  resetTimeout: 15000,   // retry after 15s
  volumeThreshold: 3,    // min calls before tripping
});

pricingBreaker.fallback(() => ({ data: { data: { totalPrice: 0 } } }));
pricingBreaker.on('open', () => console.warn('[booking-service] Pricing circuit breaker OPEN'));
pricingBreaker.on('halfOpen', () => console.info('[booking-service] Pricing circuit breaker HALF-OPEN'));
pricingBreaker.on('close', () => console.info('[booking-service] Pricing circuit breaker CLOSED'));

exports.create = async (customerId, idempotencyKey, data) => {
  // Idempotency check
  const existing = await bookingRepo.findByIdempotencyKey(idempotencyKey);
  if (existing) return { booking: existing, idempotent: true };

  // Get price estimate via circuit-breaker-protected call
  let estimatedPrice = 0;
  try {
    const res = await pricingBreaker.fire(data);
    estimatedPrice = res.data?.data?.totalPrice || 0;
  } catch (e) { console.warn('[booking-service] Pricing unavailable:', e.message); }

  const booking = await bookingRepo.create({ ...data, customerId, idempotencyKey, estimatedPrice });

  // Publish ride.created (also known as ride_requested)
  await producer.publish('ride.created', {
    bookingId: booking.id, customerId,
    pickupLat: data.pickupLat, pickupLng: data.pickupLng,
    dropoffLat: data.dropoffLat, dropoffLng: data.dropoffLng,
    vehicleType: data.vehicleType, estimatedPrice,
    timestamp: new Date().toISOString(),
  });

  return { booking, idempotent: false };
};

exports.getMyBookings = (customerId) => bookingRepo.findByCustomer(customerId);
exports.getById = async (id) => {
  const b = await bookingRepo.findById(id);
  if (!b) { const e = new Error('Booking not found'); e.status = 404; throw e; }
  return b;
};

exports.cancel = async (id, customerId) => {
  const b = await bookingRepo.findById(id);
  if (!b) { const e = new Error('Booking not found'); e.status = 404; throw e; }
  if (b.customerId !== customerId) { const e = new Error('Forbidden'); e.status = 403; throw e; }
  if (b.status !== 'PENDING') { const e = new Error(`Cannot cancel booking in ${b.status} status`); e.status = 400; throw e; }
  await bookingRepo.update(id, { status: 'CANCELLED' });
  await producer.publish('booking.cancelled', { bookingId: id, customerId, timestamp: new Date().toISOString() });
  return bookingRepo.findById(id);
};

exports.getAll = () => bookingRepo.findAll();

// Expose circuit breaker state for /health endpoint
exports.pricingBreakerState = () => pricingBreaker.opened ? 'OPEN' : pricingBreaker.halfOpen ? 'HALF_OPEN' : 'CLOSED';

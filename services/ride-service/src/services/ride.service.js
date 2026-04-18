const rideRepo = require('../repositories/ride.repo');
const producer = require('../events/producer');
const { calculateETA } = require('../modules/eta');

exports.getMyRides = (userId, role) =>
  role === 'DRIVER' ? rideRepo.findByDriver(userId) : rideRepo.findByCustomer(userId);

exports.getById = async (id) => {
  const r = await rideRepo.findById(id);
  if (!r) { const e = new Error('Ride not found'); e.status = 404; throw e; }
  return r;
};

exports.startRide = async (id) => {
  const r = await rideRepo.findById(id);
  if (!r) { const e = new Error('Ride not found'); e.status = 404; throw e; }
  if (!['ASSIGNED','PICKUP'].includes(r.status)) { const e = new Error(`Cannot start ride in ${r.status} status`); e.status = 400; throw e; }
  await rideRepo.update(id, { status: 'IN_PROGRESS', startedAt: new Date() });
  return rideRepo.findById(id);
};

exports.completeRide = async (id, finalPrice) => {
  const r = await rideRepo.findById(id);
  if (!r) { const e = new Error('Ride not found'); e.status = 404; throw e; }
  if (r.status !== 'IN_PROGRESS') { const e = new Error(`Cannot complete ride in ${r.status} status`); e.status = 400; throw e; }
  const price = finalPrice || r.estimatedPrice;
  await rideRepo.update(id, { status: 'COMPLETED', completedAt: new Date(), finalPrice: price });

  await producer.publish('ride.completed', {
    rideId: r.id, bookingId: r.bookingId, customerId: r.customerId,
    driverId: r.driverId, finalPrice: price, timestamp: new Date().toISOString(),
  });

  return rideRepo.findById(id);
};

exports.getETA = async (id) => {
  const r = await rideRepo.findById(id);
  if (!r) { const e = new Error('Ride not found'); e.status = 404; throw e; }
  if (!r.driverLat || !r.driverLng) { const e = new Error('Driver location not available'); e.status = 400; throw e; }
  return calculateETA(
    { latitude: r.driverLat, longitude: r.driverLng, vehicleType: r.vehicleType },
    { latitude: r.pickupLat, longitude: r.pickupLng }
  );
};

exports.getAll = () => rideRepo.findAll();

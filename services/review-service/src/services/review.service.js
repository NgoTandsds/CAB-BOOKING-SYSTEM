const reviewRepo = require('../repositories/review.repo');

exports.create = async (customerId, data) => {
  try { return await reviewRepo.create({ ...data, customerId }); }
  catch (e) { if (e.code === 11000) { const err = new Error('Review already submitted for this ride'); err.status = 409; throw err; } throw e; }
};

exports.getByRide = async (rideId) => {
  const r = await reviewRepo.findByRide(rideId);
  if (!r) { const e = new Error('Review not found'); e.status = 404; throw e; }
  return r;
};

exports.getByDriver = async (driverId) => {
  const reviews = await reviewRepo.findByDriver(driverId);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return { reviews, averageRating: Math.round(avg * 10) / 10, total: reviews.length };
};

exports.getMyReviews = (customerId) => reviewRepo.findByCustomer(customerId);

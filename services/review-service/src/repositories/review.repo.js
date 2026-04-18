const Review = require('../models/review.model');

exports.create = (data) => Review.create(data);
exports.findByRide = (rideId) => Review.findOne({ rideId });
exports.findByDriver = (driverId) => Review.find({ driverId }).sort({ createdAt: -1 });
exports.findByCustomer = (customerId) => Review.find({ customerId }).sort({ createdAt: -1 });

const Ride = require('../models/ride.model');

exports.create = (data) => Ride.create(data);
exports.findById = (id) => Ride.findByPk(id);
exports.findByBookingId = (bookingId) => Ride.findOne({ where: { bookingId } });
exports.findByStatus = (status) => Ride.findAll({ where: { status } });
exports.update = (id, data) => Ride.update(data, { where: { id } });
exports.findByCustomer = (customerId) => Ride.findAll({ where: { customerId }, order: [['createdAt', 'DESC']] });
exports.findByDriver = (driverId) => Ride.findAll({ where: { driverId }, order: [['createdAt', 'DESC']] });
exports.findAll = () => Ride.findAll({ order: [['createdAt', 'DESC']] });

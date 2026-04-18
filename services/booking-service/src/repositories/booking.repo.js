const Booking = require('../models/booking.model');

exports.findByIdempotencyKey = (key) => Booking.findOne({ where: { idempotencyKey: key } });
exports.create = (data) => Booking.create(data);
exports.findByCustomer = (customerId) => Booking.findAll({ where: { customerId }, order: [['createdAt', 'DESC']] });
exports.findById = (id) => Booking.findByPk(id);
exports.update = (id, data) => Booking.update(data, { where: { id }, returning: true });
exports.findAll = () => Booking.findAll({ order: [['createdAt', 'DESC']] });

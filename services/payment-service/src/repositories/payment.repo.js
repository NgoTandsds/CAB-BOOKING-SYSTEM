const Payment = require('../models/payment.model');

exports.create = (data) => Payment.create(data);
exports.findByKey = (key) => Payment.findOne({ where: { idempotencyKey: key } });
exports.findById = (id) => Payment.findByPk(id);
exports.update = (id, data) => Payment.update(data, { where: { id } });
exports.findByCustomer = (customerId) => Payment.findAll({ where: { customerId }, order: [['createdAt', 'DESC']] });
exports.findAll = () => Payment.findAll({ order: [['createdAt', 'DESC']] });

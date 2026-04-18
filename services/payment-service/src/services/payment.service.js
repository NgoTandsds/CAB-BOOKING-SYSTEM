const paymentRepo = require('../repositories/payment.repo');
const producer = require('../events/producer');

exports.create = async (customerId, idempotencyKey, data) => {
  const existing = await paymentRepo.findByKey(idempotencyKey);
  if (existing) return { payment: existing, idempotent: true };
  const payment = await paymentRepo.create({ ...data, customerId, idempotencyKey, status: 'PENDING' });
  // Async process
  setTimeout(async () => {
    const success = Math.random() > 0.1;
    if (success) {
      await paymentRepo.update(payment.id, { status: 'SUCCESS' });
      await producer.publish('payment.completed', { paymentId: payment.id, rideId: payment.rideId, customerId, amount: payment.amount, timestamp: new Date().toISOString() });
    } else {
      await paymentRepo.update(payment.id, { status: 'FAILED', failureReason: 'Declined' });
      await producer.publish('payment.failed', { paymentId: payment.id, rideId: payment.rideId, customerId, reason: 'Declined' });
    }
  }, 500);
  return { payment, idempotent: false };
};

exports.getById = async (id) => {
  const p = await paymentRepo.findById(id);
  if (!p) { const e = new Error('Payment not found'); e.status = 404; throw e; }
  return p;
};

exports.getMyPayments = (customerId) => paymentRepo.findByCustomer(customerId);
exports.getAll = () => paymentRepo.findAll();

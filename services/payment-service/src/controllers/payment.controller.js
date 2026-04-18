const paymentService = require('../services/payment.service');

exports.createPayment = async (req, res) => {
  try {
    const customerId = req.headers['x-user-id'];
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || `manual:${req.body.rideId}:${Date.now()}`;
    const { payment, idempotent } = await paymentService.create(customerId, idempotencyKey, req.body);
    res.status(idempotent ? 200 : 202).json({ success: true, data: payment, idempotent });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.getPayment = async (req, res) => {
  try {
    const data = await paymentService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.getMyPayments = async (req, res) => {
  try {
    const data = await paymentService.getMyPayments(req.headers['x-user-id']);
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getAllPayments = async (req, res) => {
  try {
    const data = await paymentService.getAll();
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

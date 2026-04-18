const bookingService = require('../services/booking.service');
const { createBookingSchema } = require('../validations/booking.validation');

exports.createBooking = async (req, res) => {
  try {
    const customerId = req.headers['x-user-id'];
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (!idempotencyKey) return res.status(400).json({ success: false, message: 'Idempotency-Key header required' });

    const { error, value } = createBookingSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(422).json({ success: false, errors: error.details.map(d => d.message) });

    const { booking, idempotent } = await bookingService.create(customerId, idempotencyKey, value);
    res.status(idempotent ? 200 : 201).json({ success: true, data: booking, idempotent });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.getBooking = async (req, res) => {
  try {
    const data = await bookingService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.getMyBookings = async (req, res) => {
  try {
    const data = await bookingService.getMyBookings(req.headers['x-user-id']);
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.cancelBooking = async (req, res) => {
  try {
    const data = await bookingService.cancel(req.params.id, req.headers['x-user-id']);
    res.json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.getAllBookings = async (req, res) => {
  try {
    const data = await bookingService.getAll();
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

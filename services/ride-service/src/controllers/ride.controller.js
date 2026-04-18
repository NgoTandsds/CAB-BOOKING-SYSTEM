const rideService = require('../services/ride.service');
const consumer = require('../events/consumer');

exports.getMyRides = async (req, res) => {
  try {
    const data = await rideService.getMyRides(req.headers['x-user-id'], req.headers['x-user-role']);
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getRide = async (req, res) => {
  try {
    const data = await rideService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.startRide = async (req, res) => {
  try {
    const data = await rideService.startRide(req.params.id);
    if (req.io) req.io.to(`ride:${req.params.id}`).emit('ride:started', { rideId: req.params.id });
    res.json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.completeRide = async (req, res) => {
  try {
    const data = await rideService.completeRide(req.params.id, req.body.finalPrice);
    if (req.io) req.io.to(`ride:${req.params.id}`).emit('ride:completed', { rideId: req.params.id, finalPrice: data.finalPrice });
    res.json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.getETA = async (req, res) => {
  try {
    const data = await rideService.getETA(req.params.id);
    res.json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.getAllRides = async (req, res) => {
  try {
    const data = await rideService.getAll();
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Internal endpoint: called by driver-service when a driver becomes available
exports.requeueMatching = async (req, res) => {
  consumer.requeueMatchingRides().catch(() => {});
  res.json({ success: true });
};

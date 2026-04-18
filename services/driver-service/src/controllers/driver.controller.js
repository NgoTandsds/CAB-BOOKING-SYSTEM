const driverService = require('../services/driver.service');

exports.register = async (req, res) => {
  try {
    const data = await driverService.register(req.headers['x-user-id'], req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.getMe = async (req, res) => {
  try {
    const data = await driverService.getMe(req.headers['x-user-id']);
    res.json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const data = await driverService.updateLocation(req.headers['x-user-id'], latitude, longitude);
    res.json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.setAvailability = async (req, res) => {
  try {
    const data = await driverService.setAvailability(req.headers['x-user-id'], req.body.isAvailable);
    res.json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.getNearby = async (req, res) => {
  try {
    const data = await driverService.getNearby(req.query.lat, req.query.lng);
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const data = await driverService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.setAvailabilityById = async (req, res) => {
  try {
    const data = await driverService.setAvailabilityById(req.params.id, req.body.isAvailable);
    res.json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.setAvailabilityByAuthId = async (req, res) => {
  try {
    const data = await driverService.setAvailability(req.params.authId, req.body.isAvailable);
    res.json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.getAll = async (req, res) => {
  try {
    const data = await driverService.getAll();
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

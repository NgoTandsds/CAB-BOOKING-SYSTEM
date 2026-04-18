const reviewService = require('../services/review.service');
const Joi = require('joi');

const schema = Joi.object({
  rideId: Joi.string().required(),
  driverId: Joi.string().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(500),
  tags: Joi.array().items(Joi.string()),
});

exports.createReview = async (req, res) => {
  try {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) return res.status(422).json({ success: false, errors: error.details.map(d => d.message) });
    const data = await reviewService.create(req.headers['x-user-id'], value);
    res.status(201).json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.getByRide = async (req, res) => {
  try {
    const data = await reviewService.getByRide(req.params.rideId);
    res.json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.getByDriver = async (req, res) => {
  try {
    const data = await reviewService.getByDriver(req.params.driverId);
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getMyReviews = async (req, res) => {
  try {
    const data = await reviewService.getMyReviews(req.headers['x-user-id']);
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

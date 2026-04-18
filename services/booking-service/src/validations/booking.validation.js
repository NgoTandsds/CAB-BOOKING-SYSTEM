const Joi = require('joi');

exports.createBookingSchema = Joi.object({
  pickupLat: Joi.number().required(),
  pickupLng: Joi.number().required(),
  pickupAddress: Joi.string(),
  dropoffLat: Joi.number().required(),
  dropoffLng: Joi.number().required(),
  dropoffAddress: Joi.string(),
  vehicleType: Joi.string().valid('SEDAN', 'SUV', 'MOTORBIKE').default('SEDAN'),
});

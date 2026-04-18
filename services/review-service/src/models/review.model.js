const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  rideId: { type: String, required: true },
  customerId: { type: String, required: true },
  driverId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 500 },
  tags: [{ type: String }],
}, { timestamps: true });

reviewSchema.index({ rideId: 1, customerId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);

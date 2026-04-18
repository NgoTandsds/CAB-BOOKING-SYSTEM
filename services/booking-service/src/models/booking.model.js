const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Booking = sequelize.define('Booking', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  idempotencyKey: { type: DataTypes.STRING, allowNull: false, unique: true },
  customerId: { type: DataTypes.UUID, allowNull: false },
  pickupLat: { type: DataTypes.FLOAT, allowNull: false },
  pickupLng: { type: DataTypes.FLOAT, allowNull: false },
  pickupAddress: { type: DataTypes.STRING },
  dropoffLat: { type: DataTypes.FLOAT, allowNull: false },
  dropoffLng: { type: DataTypes.FLOAT, allowNull: false },
  dropoffAddress: { type: DataTypes.STRING },
  vehicleType: { type: DataTypes.ENUM('SEDAN','SUV','MOTORBIKE'), defaultValue: 'SEDAN' },
  estimatedPrice: { type: DataTypes.FLOAT },
  status: { type: DataTypes.ENUM('PENDING','MATCHED','CANCELLED','COMPLETED'), defaultValue: 'PENDING' },
  rideId: { type: DataTypes.UUID },
}, { tableName: 'bookings', timestamps: true });

module.exports = Booking;

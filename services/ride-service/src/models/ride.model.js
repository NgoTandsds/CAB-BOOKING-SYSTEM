const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Ride = sequelize.define('Ride', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  bookingId: { type: DataTypes.UUID, allowNull: false },
  customerId: { type: DataTypes.UUID, allowNull: false },
  driverId: { type: DataTypes.UUID },
  pickupLat: { type: DataTypes.FLOAT, allowNull: false },
  pickupLng: { type: DataTypes.FLOAT, allowNull: false },
  dropoffLat: { type: DataTypes.FLOAT, allowNull: false },
  dropoffLng: { type: DataTypes.FLOAT, allowNull: false },
  vehicleType: { type: DataTypes.STRING, defaultValue: 'SEDAN' },
  // State machine: CREATED → MATCHING → ASSIGNED → PICKUP → IN_PROGRESS → COMPLETED → PAID
  status: {
    type: DataTypes.ENUM('CREATED','MATCHING','ASSIGNED','PICKUP','IN_PROGRESS','COMPLETED','CANCELLED','PAID'),
    defaultValue: 'CREATED',
  },
  estimatedPrice: { type: DataTypes.FLOAT },
  finalPrice: { type: DataTypes.FLOAT },
  etaMinutes: { type: DataTypes.INTEGER },
  driverLat: { type: DataTypes.FLOAT },
  driverLng: { type: DataTypes.FLOAT },
  startedAt: { type: DataTypes.DATE },
  completedAt: { type: DataTypes.DATE },
}, { tableName: 'rides', timestamps: true });

module.exports = Ride;

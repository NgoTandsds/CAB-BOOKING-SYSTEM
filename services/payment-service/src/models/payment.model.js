const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  rideId: { type: DataTypes.UUID, allowNull: false },
  bookingId: { type: DataTypes.UUID },
  customerId: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  currency: { type: DataTypes.STRING, defaultValue: 'VND' },
  method: { type: DataTypes.ENUM('CASH','CARD','WALLET'), defaultValue: 'CASH' },
  // Saga state machine: INIT → PENDING → SUCCESS | FAILED → RETRY → FAILED_FINAL
  status: { type: DataTypes.ENUM('INIT','PENDING','SUCCESS','FAILED','RETRY','FAILED_FINAL'), defaultValue: 'INIT' },
  retryCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  idempotencyKey: { type: DataTypes.STRING, unique: true },
  failureReason: { type: DataTypes.STRING },
}, { tableName: 'payments', timestamps: true });

module.exports = Payment;

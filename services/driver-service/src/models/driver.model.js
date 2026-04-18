const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Driver = sequelize.define('Driver', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  authId: { type: DataTypes.UUID, allowNull: false, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  licenseNumber: { type: DataTypes.STRING },
  vehicleType: { type: DataTypes.ENUM('SEDAN','SUV','MOTORBIKE'), defaultValue: 'SEDAN' },
  vehiclePlate: { type: DataTypes.STRING },
  rating: { type: DataTypes.FLOAT, defaultValue: 5.0 },
  totalRides: { type: DataTypes.INTEGER, defaultValue: 0 },
  acceptanceRate: { type: DataTypes.FLOAT, defaultValue: 0.9 },
  isAvailable: { type: DataTypes.BOOLEAN, defaultValue: false },
  latitude: { type: DataTypes.FLOAT },
  longitude: { type: DataTypes.FLOAT },
  status: { type: DataTypes.ENUM('OFFLINE','AVAILABLE','ON_RIDE'), defaultValue: 'OFFLINE' },
}, { tableName: 'drivers', timestamps: true });

module.exports = Driver;

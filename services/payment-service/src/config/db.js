const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(
  process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS || process.env.DB_PASSWORD,
  { host: process.env.DB_HOST, port: process.env.DB_PORT || 5432, dialect: 'postgres', logging: false, pool: { max: 20, min: 2, acquire: 30000, idle: 10000 } }
);
async function connectDB() {
  await sequelize.authenticate(); await sequelize.sync({ alter: true });
  console.log('[payment-service] Database connected');
}
module.exports = { sequelize, connectDB };

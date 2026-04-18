const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS || process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: false,
    pool: { max: 20, min: 2, acquire: 30000, idle: 10000 },
  }
);

async function connectDB() {
  await sequelize.authenticate();
  console.log('[auth-service] Database connected');
  await sequelize.sync({ alter: true });
  console.log('[auth-service] Database synced');
}

module.exports = { sequelize, connectDB };

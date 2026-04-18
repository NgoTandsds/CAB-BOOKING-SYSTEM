const mongoose = require('mongoose');

async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[notification-service] MongoDB connected');
}

module.exports = { connectDB };

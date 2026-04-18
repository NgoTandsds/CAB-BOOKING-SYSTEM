const { Kafka } = require('kafkajs');
const paymentRepo = require('../repositories/payment.repo');
const producer = require('./producer');

const kafka = new Kafka({ clientId: 'payment-service-consumer', brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','), retry: { retries: 5 } });

exports.start = async () => {
  const consumer = kafka.consumer({ groupId: 'payment-service-group' });
  await consumer.connect();
  await consumer.subscribe({ topics: ['ride.completed'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const data = JSON.parse(message.value.toString());
      const key = `ride:${data.rideId}`;
      const existing = await paymentRepo.findByKey(key);
      if (existing) return;

      // Create a PENDING payment — customer must manually confirm payment
      await paymentRepo.create({
        rideId: data.rideId, bookingId: data.bookingId, customerId: data.customerId,
        amount: data.finalPrice, idempotencyKey: key, status: 'PENDING',
      });
    },
  });
  console.log('[payment-service] Kafka consumer started');
};

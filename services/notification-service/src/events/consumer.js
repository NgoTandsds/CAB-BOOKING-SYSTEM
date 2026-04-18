const { Kafka } = require('kafkajs');
const notificationRepo = require('../repositories/notification.repo');

const kafka = new Kafka({ clientId: 'notification-service-consumer', brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','), retry: { retries: 5 } });

let io;
exports.setIO = (socketIO) => { io = socketIO; };

exports.start = async () => {
  const consumer = kafka.consumer({ groupId: 'notification-service-group' });
  await consumer.connect();
  await consumer.subscribe({ topics: ['ride.assigned', 'payment.completed', 'payment.failed', 'ride.completed'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const data = JSON.parse(message.value.toString());
      let notif;

      if (topic === 'ride.assigned') {
        notif = await notificationRepo.create({ userId: data.customerId, type: 'RIDE_ASSIGNED', title: 'Driver Assigned!', body: `Your driver is on the way. ETA: ${data.etaMinutes} minutes.`, data });
      } else if (topic === 'payment.completed') {
        notif = await notificationRepo.create({ userId: data.customerId, type: 'PAYMENT_SUCCESS', title: 'Payment Successful', body: `Payment of ${data.amount} VND completed.`, data });
      } else if (topic === 'payment.failed') {
        notif = await notificationRepo.create({ userId: data.customerId || 'unknown', type: 'PAYMENT_FAILED', title: 'Payment Failed', body: `Payment failed: ${data.reason}`, data });
      } else if (topic === 'ride.completed') {
        notif = await notificationRepo.create({ userId: data.customerId, type: 'RIDE_COMPLETED', title: 'Ride Completed', body: `Your ride is done. Total: ${data.finalPrice} VND. Please rate your driver!`, data });
      }

      if (notif && io) io.to(`user:${notif.userId}`).emit('notification', notif);
    },
  });
  console.log('[notification-service] Kafka consumer started');
};

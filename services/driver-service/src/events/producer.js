const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'driver-service', brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','), retry: { retries: 5 } });
const producer = kafka.producer();
let connected = false;
const messageBuffer = []; // TC 73: buffer messages when Kafka is unavailable
const MAX_BUFFER = 1000;

exports.connect = async () => {
  if (!connected) {
    await producer.connect();
    connected = true;
    console.log('[driver-service] Kafka producer connected');
    await _flushBuffer();
  }
};

async function _flushBuffer() {
  while (messageBuffer.length > 0 && connected) {
    const { topic, message } = messageBuffer.shift();
    try {
      await producer.send({ topic, messages: [{ key: message.driverId || message.id, value: JSON.stringify(message) }] });
    } catch (e) {
      console.warn('[driver-service] Kafka flush failed, re-buffering:', e.message);
      messageBuffer.unshift({ topic, message });
      connected = false;
      break;
    }
  }
}

exports.publish = async (topic, message) => {
  if (!connected) {
    if (messageBuffer.length < MAX_BUFFER) {
      messageBuffer.push({ topic, message });
      console.warn(`[driver-service] Kafka unavailable — buffered message for topic '${topic}' (buffer size: ${messageBuffer.length})`);
    } else {
      console.error(`[driver-service] Kafka buffer full (${MAX_BUFFER}) — dropping message for topic '${topic}'`);
    }
    exports.connect().catch(() => {});
    return;
  }
  try {
    await producer.send({ topic, messages: [{ key: message.driverId || message.id, value: JSON.stringify(message) }] });
  } catch (e) {
    connected = false;
    console.error('[driver-service] Kafka send failed, buffering:', e.message);
    if (messageBuffer.length < MAX_BUFFER) messageBuffer.push({ topic, message });
    exports.connect().catch(() => {});
  }
};

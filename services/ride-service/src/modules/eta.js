/**
 * ETA Module — internal module of ride-service
 * Calculates ETA from driver location to pickup point
 */
const client = require('prom-client');
const Redis = require('ioredis');

const etaCalculationsTotal = new client.Counter({
  name: 'eta_calculations_total',
  help: 'Total number of ETA calculations performed',
  labelNames: ['vehicle_type'],
});
let redis;
const getRedis = () => {
  if (!redis) redis = new Redis(process.env.REDIS_URL);
  return redis;
};

const AVG_SPEED = { SEDAN: { peak: 20, off: 35 }, SUV: { peak: 18, off: 30 }, MOTORBIKE: { peak: 25, off: 45 } };

function isPeakHour() {
  const h = new Date().getHours();
  return (h >= 7 && h <= 9) || (h >= 17 && h <= 20);
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function calculateETA(driverLocation, pickup) {
  const { latitude: dLat, longitude: dLng, vehicleType = 'SEDAN' } = driverLocation;
  const { latitude: pLat, longitude: pLng } = pickup;

  let trafficFactor = 1.0;
  try { const v = await getRedis().get('traffic:factor'); if (v) trafficFactor = parseFloat(v); } catch {}

  const distanceKm = haversineKm(dLat, dLng, pLat, pLng);
  const speeds = AVG_SPEED[vehicleType] || AVG_SPEED.SEDAN;
  const speed = isPeakHour() ? speeds.peak : speeds.off;
  const etaMinutes = Math.max(1, Math.round((distanceKm / speed) * 60 * trafficFactor));
  etaCalculationsTotal.inc({ vehicle_type: vehicleType });
  return { etaMinutes, distanceKm: Math.round(distanceKm * 100) / 100, trafficFactor };
}

module.exports = { calculateETA, etaCalculationsTotal };

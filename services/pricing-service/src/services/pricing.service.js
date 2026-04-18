const getRedis = require('../config/redis');

const BASE = { SEDAN: 10000, SUV: 15000, MOTORBIKE: 7000 };
const PER_KM = { SEDAN: 8000, SUV: 12000, MOTORBIKE: 5000 };
const SURGE_TTL = 60;

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function getSurge(area = 'default') {
  const redis = getRedis();
  const cached = await redis.get(`surge:${area}`);
  if (cached) return parseFloat(cached);
  const demand = parseFloat(await redis.get(`demand:${area}`) || '1');
  const supply = parseFloat(await redis.get(`supply:${area}`) || '1');
  // surge = max(1.0, demand_index / supply_index) — never below 1
  const surge = Math.max(1.0, demand / supply);
  await redis.setex(`surge:${area}`, SURGE_TTL, surge.toString());
  return surge;
}

exports.calculate = async ({ pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType = 'SEDAN', area = 'default' }) => {
  const distanceKm = haversineKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
  const surge = await getSurge(area);
  const base = BASE[vehicleType] || BASE.SEDAN;
  const perKm = PER_KM[vehicleType] || PER_KM.SEDAN;
  const basePrice = base + perKm * distanceKm;
  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    basePrice: Math.round(basePrice),
    surgeMultiplier: surge,
    totalPrice: Math.round(basePrice * surge),
    vehicleType, currency: 'VND',
  };
};

exports.getSurge = getSurge;

exports.updateSurge = async (area, demandIndex, supplyIndex) => {
  const redis = getRedis();
  if (demandIndex !== undefined) await redis.set(`demand:${area}`, demandIndex);
  if (supplyIndex !== undefined) await redis.set(`supply:${area}`, supplyIndex);
  await redis.del(`surge:${area}`);
  return getSurge(area);
};

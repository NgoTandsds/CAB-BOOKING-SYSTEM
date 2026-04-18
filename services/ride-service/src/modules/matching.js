/**
 * AI Driver Matching Module — internal module of ride-service
 * Score = (1/distance)*0.5 + (rating/5)*0.3 + acceptanceRate*0.2
 */
const client = require('prom-client');

const matchingRequestsTotal = new client.Counter({
  name: 'matching_requests_total',
  help: 'Total number of AI driver matching requests',
  labelNames: ['status'],
});

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function scoreDriver(driver, pickupLat, pickupLng) {
  const dist = haversineKm(driver.latitude, driver.longitude, pickupLat, pickupLng);
  return {
    driverId: driver.id,
    score: (dist > 0 ? 1/dist : 100)*0.5 + ((driver.rating||5.0)/5.0)*0.3 + (driver.acceptanceRate||0.9)*0.2,
    distanceKm: Math.round(dist*100)/100,
    rating: driver.rating,
    driver,
  };
}

// TC 60: Rule-based fallback — nearest driver only (no scoring)
function findNearestDriver(pickup, candidates) {
  const pool = candidates.filter(d => d.latitude != null && d.longitude != null);
  if (pool.length === 0) return null;
  pool.sort((a, b) =>
    haversineKm(a.latitude, a.longitude, pickup.latitude, pickup.longitude) -
    haversineKm(b.latitude, b.longitude, pickup.latitude, pickup.longitude)
  );
  return { driverId: pool[0].id, score: 0, distanceKm: Math.round(haversineKm(pool[0].latitude, pool[0].longitude, pickup.latitude, pickup.longitude) * 100) / 100, rating: pool[0].rating, driver: pool[0] };
}

async function findBestDriver(pickup, vehicleType, candidates) {
  if (!candidates || candidates.length === 0) {
    matchingRequestsTotal.inc({ status: 'no_candidates' });
    return null;
  }
  try {
    const eligible = vehicleType ? candidates.filter(d => !d.vehicleType || d.vehicleType === vehicleType) : candidates;
    const pool = eligible.length > 0 ? eligible : candidates;
    const scored = pool.map(d => scoreDriver(d, pickup.latitude, pickup.longitude));
    scored.sort((a, b) => b.score - a.score);
    matchingRequestsTotal.inc({ status: 'success' });
    return scored[0];
  } catch (e) {
    // TC 60: fallback to nearest-only rule if scoring fails
    console.warn('[matching] Scoring failed, falling back to nearest-only:', e.message);
    const fallback = findNearestDriver(pickup, candidates);
    matchingRequestsTotal.inc({ status: 'fallback_nearest' });
    return fallback;
  }
}

module.exports = { findBestDriver, findNearestDriver, matchingRequestsTotal };

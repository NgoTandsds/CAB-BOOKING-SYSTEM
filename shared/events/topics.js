/**
 * Kafka topic constants — shared across services
 */
module.exports = {
  RIDE_CREATED: 'ride.created',        // booking → ride-service, ETA
  RIDE_ASSIGNED: 'ride.assigned',      // ride-service → notification
  RIDE_COMPLETED: 'ride.completed',    // ride-service → payment
  PAYMENT_COMPLETED: 'payment.completed', // payment → ride, notification
  PAYMENT_FAILED: 'payment.failed',    // payment → notification
  DRIVER_LOCATION_UPDATED: 'driver.location.updated', // driver → ride, monitoring
};

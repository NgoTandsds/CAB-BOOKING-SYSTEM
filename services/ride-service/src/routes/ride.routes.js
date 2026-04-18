const router = require('express').Router();
const c = require('../controllers/ride.controller');

router.get('/',                      c.getMyRides);
router.get('/all',                   c.getAllRides);    // admin
router.post('/internal/requeue',     c.requeueMatching); // internal: driver-service calls this
router.get('/:id',                   c.getRide);
router.put('/:id/start',             c.startRide);
router.put('/:id/complete',          c.completeRide);
router.get('/:id/eta',               c.getETA);

module.exports = router;

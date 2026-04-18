const router = require('express').Router();
const c = require('../controllers/driver.controller');

router.post('/register',              c.register);
router.get('/me',                     c.getMe);
router.put('/location',               c.updateLocation);
router.put('/availability',           c.setAvailability);
router.get('/nearby',                 c.getNearby);
router.get('/all',                    c.getAll);     // admin
router.patch('/internal/auth/:authId/available', c.setAvailabilityByAuthId); // internal: ride-service calls this (authId)
router.patch('/internal/:id/available', c.setAvailabilityById); // internal: by driver UUID
router.get('/:id',                    c.getById);

module.exports = router;

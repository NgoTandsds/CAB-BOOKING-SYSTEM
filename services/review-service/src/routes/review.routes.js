const router = require('express').Router();
const c = require('../controllers/review.controller');

router.post('/',                    c.createReview);
router.get('/me',                   c.getMyReviews);
router.get('/driver/:driverId',     c.getByDriver);
router.get('/ride/:rideId',         c.getByRide);

module.exports = router;

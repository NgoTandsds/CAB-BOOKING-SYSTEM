const router = require('express').Router();
const c = require('../controllers/booking.controller');

router.post('/',          c.createBooking);
router.get('/',           c.getMyBookings);
router.get('/all',        c.getAllBookings);   // admin
router.get('/:id',        c.getBooking);
router.put('/:id/cancel', c.cancelBooking);

module.exports = router;

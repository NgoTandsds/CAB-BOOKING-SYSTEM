const router = require('express').Router();
const c = require('../controllers/payment.controller');

router.post('/',    c.createPayment);
router.get('/',     c.getMyPayments);
router.get('/all',  c.getAllPayments);  // admin
router.get('/:id',  c.getPayment);

module.exports = router;

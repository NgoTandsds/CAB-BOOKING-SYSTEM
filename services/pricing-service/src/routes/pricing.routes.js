const router = require('express').Router();
const c = require('../controllers/pricing.controller');

router.post('/calculate', c.calculate);
router.get('/surge',      c.getSurge);
router.post('/surge',     c.updateSurge);

module.exports = router;

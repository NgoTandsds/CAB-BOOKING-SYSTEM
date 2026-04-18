const router = require('express').Router();
const c = require('../controllers/notification.controller');

router.get('/',           c.getNotifications);
router.put('/read-all',   c.markAllRead);
router.put('/:id/read',   c.markRead);

module.exports = router;

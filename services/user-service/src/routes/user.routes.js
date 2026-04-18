const router = require('express').Router();
const controller = require('../controllers/user.controller');

router.get('/profile',  controller.getProfile);
router.put('/profile',  controller.updateProfile);
router.get('/all',      controller.getAllUsers);  // admin
router.get('/:id',      controller.getUserById);

module.exports = router;

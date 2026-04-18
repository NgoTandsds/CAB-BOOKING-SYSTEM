const router = require('express').Router();
const controller = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth.middleware');
const { registerSchema, loginSchema, refreshSchema } = require('../validations/auth.validation');

// Public
router.post('/register', validate(registerSchema), controller.register);
router.post('/login',    validate(loginSchema),    controller.login);
router.post('/refresh',  validate(refreshSchema),  controller.refresh);
router.get('/verify',    controller.verify);

// Protected
router.post('/logout', requireAuth, controller.logout);
router.get('/me',      requireAuth, controller.me);

module.exports = router;

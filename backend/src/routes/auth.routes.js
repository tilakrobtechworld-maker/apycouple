const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimiter');

router.post('/register', authLimiter, [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  body('bride_name').notEmpty().withMessage('Bride name required'),
  body('groom_name').notEmpty().withMessage('Groom name required'),
], validate, authController.register);

router.post('/login', authLimiter, [
  body('email').isEmail(),
  body('password').notEmpty(),
], validate, authController.login);

router.post('/admin/login', authLimiter, [
  body('email').isEmail(),
  body('password').notEmpty(),
], validate, authController.adminLogin);

router.post('/refresh', authController.refreshToken);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.put('/change-password', protect, [
  body('oldPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
], validate, authController.changePassword);

module.exports = router;


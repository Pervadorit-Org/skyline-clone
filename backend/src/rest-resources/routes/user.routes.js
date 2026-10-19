const express = require('express');
const userController = require('../controllers/user.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/profile', authMiddleware, userController.getProfile);
router.patch('/profile', authMiddleware, userController.updateProfile);
router.patch('/profile-photo', authMiddleware, userController.updateProfilePhoto);
// Marketing preferences (Email/SMS) disabled: no table/columns for it in the final DB.
// router.patch('/marketing-preferences', authMiddleware, userController.updateMarketingPrefs);
router.post('/change-password', authMiddleware, userController.changePassword);

module.exports = router;

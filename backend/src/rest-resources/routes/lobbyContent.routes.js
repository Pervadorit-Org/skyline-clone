const express = require('express');
const multer = require('multer');
const lobbyController = require('../controllers/lobbyContent.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminMiddleware } = require('../middlewares/admin.middleware');

const router = express.Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Public — signed-in lobby reads the current store's lobby content.
router.get('/config', lobbyController.getPublicConfig);
router.get('/popular', lobbyController.getPopular);

// Admin — manage a store's lobby content.
router.get('/admin/popular', authMiddleware, adminMiddleware, lobbyController.getPopularAdmin);
router.get('/admin/settings', authMiddleware, adminMiddleware, lobbyController.getSettingsAdmin);
router.put('/admin/settings', authMiddleware, adminMiddleware, lobbyController.updateSettingsAdmin);
router.delete('/admin/settings', authMiddleware, adminMiddleware, lobbyController.deleteSettingsAdmin);

// Admin — upload a lobby image to S3 (returns { url }), same flow as blog/slideshow.
router.post(
  '/admin/upload-image',
  authMiddleware,
  adminMiddleware,
  (req, res, next) => {
    imageUpload.single('file')(req, res, (err) => {
      if (err) {
        const message =
          err.code === 'LIMIT_FILE_SIZE'
            ? 'Image is too large. Maximum size is 5MB.'
            : err.message || 'Upload failed.';
        return res.status(400).json({ message });
      }
      return next();
    });
  },
  lobbyController.uploadImage,
);

module.exports = router;

const express = require('express');
const multer = require('multer');
const homePageController = require('../controllers/homePageContent.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminMiddleware } = require('../middlewares/admin.middleware');

const router = express.Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Public — guest website reads the current store's home page content.
router.get('/config', homePageController.getPublicConfig);

// Admin — manage a store's home page content.
router.get('/admin/settings', authMiddleware, adminMiddleware, homePageController.getSettingsAdmin);
router.put('/admin/settings', authMiddleware, adminMiddleware, homePageController.updateSettingsAdmin);
router.delete('/admin/settings', authMiddleware, adminMiddleware, homePageController.deleteSettingsAdmin);

// Admin — upload a home page image to S3 (returns { url }), same flow as blog/slideshow.
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
  homePageController.uploadImage,
);

module.exports = router;

const express = require('express');
const multer = require('multer');
const footerContentController = require('../controllers/footerContent.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminMiddleware } = require('../middlewares/admin.middleware');

const router = express.Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Public — the website footer reads the current store's footer content.
router.get('/config', footerContentController.getPublicConfig);

// Admin — manage a store's footer content.
router.get('/admin/settings', authMiddleware, adminMiddleware, footerContentController.getSettingsAdmin);
router.put('/admin/settings', authMiddleware, adminMiddleware, footerContentController.updateSettingsAdmin);
router.delete('/admin/settings', authMiddleware, adminMiddleware, footerContentController.deleteSettingsAdmin);

// Admin — upload a footer image to S3 (returns { url }), same flow as blog/home page.
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
  footerContentController.uploadImage,
);

module.exports = router;

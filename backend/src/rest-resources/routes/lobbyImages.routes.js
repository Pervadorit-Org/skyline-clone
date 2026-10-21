'use strict';

const express = require('express');
const multer = require('multer');
const controller = require('../controllers/lobbyImages.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminMiddleware } = require('../middlewares/admin.middleware');
const { DESKTOP_MAX_BYTES, webpMulterFilter, multerLimitMessage } = require('../../utils/adminImageUploadConstraints');

const router = express.Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DESKTOP_MAX_BYTES },
  fileFilter: webpMulterFilter
});

// Public: images the lobby shows (banners + Daily Rewards / Spin card backgrounds).
router.get('/config', controller.getPublic);

router.get('/admin/settings', authMiddleware, adminMiddleware, controller.getAdmin);
router.put('/admin/settings', authMiddleware, adminMiddleware, controller.updateAdmin);
router.delete('/admin/settings', authMiddleware, adminMiddleware, controller.resetAdmin);
router.post(
  '/admin/image-upload',
  authMiddleware,
  adminMiddleware,
  (req, res, next) => {
    imageUpload.single('file')(req, res, (err) => {
      if (err) {
        const message = err.code === 'LIMIT_FILE_SIZE' ? multerLimitMessage(DESKTOP_MAX_BYTES) : err.message || 'Upload failed.';
        return res.status(400).json({ message });
      }
      return next();
    });
  },
  controller.uploadImage
);

module.exports = router;

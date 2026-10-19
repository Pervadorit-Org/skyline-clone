'use strict';

const express = require('express');
const favoritesController = require('../controllers/favorites.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authMiddleware, favoritesController.list);
router.post('/', authMiddleware, favoritesController.update);

module.exports = router;

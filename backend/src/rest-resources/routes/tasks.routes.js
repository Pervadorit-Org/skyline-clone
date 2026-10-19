'use strict';

const express = require('express');
const tasksController = require('../controllers/tasks.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authMiddleware, tasksController.getStatus);
router.post('/:taskId/claim', authMiddleware, tasksController.claim);

module.exports = router;

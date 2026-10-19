'use strict';

const tasksService = require('../../services/tasks/userTasks.service');
const { sendSuccess, sendError } = require('../../helpers/response.helpers');

function fail(res, err, fallback) {
  const status = err.statusCode || 500;
  const message = status < 500 && err.message ? err.message : fallback;
  if (status >= 500) console.error('tasks controller error:', err?.message || err);
  sendError(res, message, status);
}

async function getStatus(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, 'Unauthorized', 401);
    const [status, claimed] = await Promise.all([
      tasksService.getTaskStatus(userId),
      tasksService.getClaimedHistory(userId)
    ]);
    sendSuccess(res, { ...status, claimed });
  } catch (err) {
    fail(res, err, 'Unable to load tasks.');
  }
}

async function claim(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, 'Unauthorized', 401);
    const data = await tasksService.claimTask(userId, req.body?.group, req.params.taskId);
    sendSuccess(res, data);
  } catch (err) {
    fail(res, err, 'Unable to claim this task.');
  }
}

module.exports = { getStatus, claim };

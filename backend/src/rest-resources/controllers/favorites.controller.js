'use strict';

const favorites = require('../../services/favorites/favoriteGames.service');
const { sendSuccess, sendError } = require('../../helpers/response.helpers');

function fail(res, err, fallback) {
  const status = err.statusCode || 500;
  if (status >= 500) console.error('favorites controller error:', err?.message || err);
  sendError(res, status < 500 && err.message ? err.message : fallback, status);
}

async function list(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, 'Unauthorized', 401);
    sendSuccess(res, { ids: await favorites.getFavorites(userId) });
  } catch (err) {
    fail(res, err, 'Unable to load favorites.');
  }
}

/** Body: { add: [ids], remove: [ids] } — returns the merged list. */
async function update(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, 'Unauthorized', 401);
    const add = Array.isArray(req.body?.add) ? req.body.add : [];
    const remove = Array.isArray(req.body?.remove) ? req.body.remove : [];
    sendSuccess(res, { ids: await favorites.updateFavorites(userId, { add, remove }) });
  } catch (err) {
    fail(res, err, 'Unable to save favorites.');
  }
}

module.exports = { list, update };

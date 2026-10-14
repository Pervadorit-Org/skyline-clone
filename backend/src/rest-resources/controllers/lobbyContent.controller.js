const lobbyService = require('../../services/lobbyContent');
const { sendSuccess, sendError } = require('../../helpers/response.helpers');
const { isMasterAdmin, isStoreAdmin, isDistributorAdmin } = require('../../constants/roles');
const { can, canAdmin } = require('../../utils/permissionHelpers');
const { STORE_FEATURE_KEYS, ADMIN_FEATURE_KEYS } = require('../../constants/permissions');
const { uploadImageBuffer } = require('../../utils/s3Upload');

/** Gated under the existing "Homepage pictures" permission (closest fit). */
function assertCanEdit(req) {
  if (isMasterAdmin(req.role) && canAdmin(req, ADMIN_FEATURE_KEYS.DASHBOARD_SLIDESHOW)) return true;
  if (isDistributorAdmin(req.role)) return true;
  if (isStoreAdmin(req.role) && can(req, STORE_FEATURE_KEYS.DASHBOARD_SLIDESHOW)) return true;
  return false;
}

/** Which store's content this admin request targets. */
async function resolveAdminScope(req, storeCodeInput) {
  if (isStoreAdmin(req.role) && req.storeCode) {
    return lobbyService.resolveScopeFromStoreCode(req.storeCode);
  }
  // Master / distributor admin must name the store (lobby content is store-specific).
  const code = storeCodeInput != null ? String(storeCodeInput).trim() : '';
  if (!code) {
    const err = new Error('Select a store to manage its lobby.');
    err.statusCode = 400;
    throw err;
  }
  return lobbyService.resolveScopeFromStoreCode(code);
}

/** Public: used by the signed-in lobby. Resolves the store from ?store_code / host. */
async function getPublicConfig(req, res) {
  try {
    const scope = await lobbyService.resolveScopeFromStoreCode(req.query.store_code);
    const content = await lobbyService.getLobbyContent(scope);
    sendSuccess(res, { lobby: content });
  } catch (err) {
    sendError(res, err.message || 'Unable to load lobby content.', err.statusCode || 500);
  }
}

/** Public: ranked game ids for the Top 10 / Trending rows (ids only, no player data). */
async function getPopular(req, res) {
  try {
    const scope = await lobbyService.resolveScopeFromStoreCode(req.query.store_code);
    const content = await lobbyService.getLobbyContent(scope);
    if (content?.popularity?.mode === 'off') return sendSuccess(res, { ids: [], source: 'off' });
    const days = content?.popularity?.days || 30;
    const { games, source } = await lobbyService.getPopularGames({ storeCode: scope?.storeCode, days });
    sendSuccess(res, { ids: games.map((g) => g.id), source, days });
  } catch (err) {
    // Ranking is a nice-to-have: never break the lobby over it.
    sendSuccess(res, { ids: [], source: 'unavailable' });
  }
}

/** Admin: the same ranking with play / player counts, to help pick the Top 10. */
async function getPopularAdmin(req, res) {
  try {
    if (!assertCanEdit(req)) {
      return sendError(res, 'You do not have permission to manage the lobby.', 403);
    }
    const scope = await resolveAdminScope(req, req.query.store_code);
    const days = Number(req.query.days) || 30;
    const data = await lobbyService.getPopularGames({ storeCode: scope?.storeCode, days });
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, err.message || 'Unable to load popular games.', err.statusCode || 500);
  }
}

async function getSettingsAdmin(req, res) {
  try {
    if (!assertCanEdit(req)) {
      return sendError(res, 'You do not have permission to manage the lobby.', 403);
    }
    const scope = await resolveAdminScope(req, req.query.store_code);
    const content = await lobbyService.getLobbyContent(scope);
    sendSuccess(res, { lobby: content, scope });
  } catch (err) {
    sendError(res, err.message || 'Unable to load lobby content.', err.statusCode || 500);
  }
}

async function updateSettingsAdmin(req, res) {
  try {
    if (!assertCanEdit(req)) {
      return sendError(res, 'You do not have permission to manage the lobby.', 403);
    }
    const storeCodeInput = req.body?.storeCode ?? req.query.store_code;
    const scope = await resolveAdminScope(req, storeCodeInput);
    const payload = req.body?.lobby ?? req.body ?? {};
    const updatedBy = req.user?.username || req.user?.email || null;
    const content = await lobbyService.updateLobbyContent(payload, scope, updatedBy);
    sendSuccess(res, { lobby: content, message: 'Lobby saved.' });
  } catch (err) {
    sendError(res, err.message || 'Unable to save lobby content.', err.statusCode || 500);
  }
}

async function deleteSettingsAdmin(req, res) {
  try {
    if (!assertCanEdit(req)) {
      return sendError(res, 'You do not have permission to manage the lobby.', 403);
    }
    const storeCodeInput = req.body?.storeCode ?? req.query.store_code;
    const scope = await resolveAdminScope(req, storeCodeInput);
    const content = await lobbyService.deleteLobbyContent(scope);
    sendSuccess(res, { lobby: content, message: 'Lobby reset to default.' });
  } catch (err) {
    sendError(res, err.message || 'Unable to reset lobby content.', err.statusCode || 500);
  }
}

/** Upload one lobby image to S3, return its public URL. */
async function uploadImage(req, res) {
  try {
    if (!assertCanEdit(req)) {
      return sendError(res, 'You do not have permission to manage the lobby.', 403);
    }
    const file = req.file;
    if (!file || !file.buffer) {
      return sendError(res, 'No image file provided.', 400);
    }
    const url = await uploadImageBuffer(file.buffer, {
      contentType: file.mimetype,
      keyPrefix: 'lobby',
    });
    return sendSuccess(res, { url });
  } catch (err) {
    return sendError(res, err.message || 'Upload failed.', err.statusCode || 500);
  }
}

module.exports = {
  getPublicConfig,
  getPopular,
  getPopularAdmin,
  getSettingsAdmin,
  updateSettingsAdmin,
  deleteSettingsAdmin,
  uploadImage,
};

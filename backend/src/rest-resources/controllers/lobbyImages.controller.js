'use strict';

const lobbyImages = require('../../services/lobbyImages/lobbyImagesSettings.service');
const promoModals = require('../../services/dashboardPromoModals');
const { sendSuccess, sendError } = require('../../helpers/response.helpers');
const { isMasterAdmin, isStoreAdmin, isDistributorAdmin } = require('../../constants/roles');
const { can } = require('../../utils/permissionHelpers');
const { STORE_FEATURE_KEYS } = require('../../constants/permissions');
const { uploadImageBuffer } = require('../../utils/s3Upload');
const { DESKTOP_MAX_BYTES, assertWebpUpload } = require('../../utils/adminImageUploadConstraints');

function assertCanEdit(req) {
  if (isMasterAdmin(req.role) || isDistributorAdmin(req.role)) return true;
  return isStoreAdmin(req.role) && can(req, STORE_FEATURE_KEYS.DASHBOARD_PROMO_MODALS);
}

/** Store admins edit their own store; master/distributor admins pass ?store_code=. */
async function resolveAdminScope(req) {
  if (isStoreAdmin(req.role) && req.distributorCode != null && req.storeCode != null) {
    return { distributorCode: req.distributorCode, storeCode: req.storeCode };
  }
  const code = req.query?.store_code || req.query?.storeCode || req.body?.storeCode;
  if (!code) {
    const err = new Error('store_code is required.');
    err.statusCode = 400;
    throw err;
  }
  return promoModals.resolveScopeFromStoreCode(code);
}

/** Public: the images shown on the lobby for a store. */
async function getPublic(req, res) {
  try {
    const code = req.query?.store_code || req.query?.storeCode || '';
    const scope = code ? await promoModals.resolveScopeFromStoreCode(code) : null;
    const data = await lobbyImages.getLobbyImages(scope);
    sendSuccess(res, { lobbyImages: data });
  } catch (err) {
    sendError(res, err.message || 'Unable to load lobby images.', err.statusCode || 500);
  }
}

async function getAdmin(req, res) {
  try {
    if (!assertCanEdit(req)) return sendError(res, 'You do not have permission to manage lobby images.', 403);
    const data = await lobbyImages.getLobbyImages(await resolveAdminScope(req));
    sendSuccess(res, { lobbyImages: data });
  } catch (err) {
    sendError(res, err.message || 'Unable to load lobby images.', err.statusCode || 500);
  }
}

async function updateAdmin(req, res) {
  try {
    if (!assertCanEdit(req)) return sendError(res, 'You do not have permission to manage lobby images.', 403);
    const data = await lobbyImages.updateLobbyImages(
      req.body?.lobbyImages ?? req.body ?? {},
      await resolveAdminScope(req)
    );
    sendSuccess(res, { lobbyImages: data, message: 'Lobby images saved.' });
  } catch (err) {
    sendError(res, err.message || 'Unable to save lobby images.', err.statusCode || 500);
  }
}

async function resetAdmin(req, res) {
  try {
    if (!assertCanEdit(req)) return sendError(res, 'You do not have permission to manage lobby images.', 403);
    const data = await lobbyImages.resetLobbyImages(await resolveAdminScope(req));
    sendSuccess(res, { lobbyImages: data, message: 'Lobby images reset to the built-in artwork.' });
  } catch (err) {
    sendError(res, err.message || 'Unable to reset lobby images.', err.statusCode || 500);
  }
}

async function uploadImage(req, res) {
  try {
    if (!assertCanEdit(req)) return sendError(res, 'You do not have permission to manage lobby images.', 403);
    const file = req.file;
    if (!file || !file.buffer) return sendError(res, 'No image file provided.', 400);
    assertWebpUpload(file, { maxBytes: DESKTOP_MAX_BYTES, label: 'Image' });
    const url = await uploadImageBuffer(file.buffer, { contentType: 'image/webp', keyPrefix: 'lobby-images' });
    return sendSuccess(res, { data: { url } });
  } catch (err) {
    return sendError(res, err.message || 'Upload failed.', err.statusCode || 500);
  }
}

module.exports = { getPublic, getAdmin, updateAdmin, resetAdmin, uploadImage };

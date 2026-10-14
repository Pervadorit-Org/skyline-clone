'use strict';

const footerContent = require('../../services/footerContent');
const { sendSuccess, sendError } = require('../../helpers/response.helpers');
const { ROLES } = require('../../constants/roles');
const { can, canAdmin } = require('../../utils/permissionHelpers');
const { STORE_FEATURE_KEYS, ADMIN_FEATURE_KEYS } = require('../../constants/permissions');
const { uploadImageBuffer } = require('../../utils/s3Upload');

const DENY = "You don't have access to the website footer. Please contact your administrator if you need access.";

/** Same rule as the existing "Footer links" admin screen (footer_pages permission). */
function hasFooterAccess(req) {
  if (req.role === ROLES.DISTRIBUTOR_ADMIN) return false;
  if (req.role === ROLES.MASTER_ADMIN) return canAdmin(req, ADMIN_FEATURE_KEYS.FOOTER_PAGES);
  if (req.role === ROLES.STORE_ADMIN) return can(req, STORE_FEATURE_KEYS.FOOTER_PAGES);
  return false;
}

/** Which store's content this admin request targets. */
async function resolveAdminScope(req, storeCodeInput) {
  if (req.role === ROLES.STORE_ADMIN && req.storeCode) {
    return footerContent.resolveScopeFromStoreCode(req.storeCode);
  }
  // Master admin must name the store (footer content is store-specific).
  const code = storeCodeInput != null ? String(storeCodeInput).trim() : '';
  if (!code) {
    const err = new Error('Select a store to manage its footer.');
    err.statusCode = 400;
    throw err;
  }
  return footerContent.resolveScopeFromStoreCode(code);
}

/** Public: used by the website footer. Resolves the store from ?store_code. */
async function getPublicConfig(req, res) {
  try {
    const scope = await footerContent.resolveScopeFromStoreCode(req.query.store_code);
    const content = await footerContent.getFooterContent(scope);
    sendSuccess(res, { footer: content });
  } catch (err) {
    sendError(res, err.message || 'Unable to load footer content.', err.statusCode || 500);
  }
}

async function getSettingsAdmin(req, res) {
  try {
    if (!hasFooterAccess(req)) return sendError(res, DENY, 403);
    const scope = await resolveAdminScope(req, req.query.store_code);
    const content = await footerContent.getFooterContent(scope);
    sendSuccess(res, { footer: content, scope });
  } catch (err) {
    sendError(res, err.message || 'Unable to load footer content.', err.statusCode || 500);
  }
}

async function updateSettingsAdmin(req, res) {
  try {
    if (!hasFooterAccess(req)) return sendError(res, DENY, 403);
    const scope = await resolveAdminScope(req, req.body?.storeCode ?? req.query.store_code);
    const payload = req.body?.footer ?? {};
    const updatedBy = req.user?.username || req.user?.email || null;
    const content = await footerContent.updateFooterContent(payload, scope, updatedBy);
    sendSuccess(res, { footer: content, message: 'Footer saved.' });
  } catch (err) {
    sendError(res, err.message || 'Unable to save footer content.', err.statusCode || 500);
  }
}

async function deleteSettingsAdmin(req, res) {
  try {
    if (!hasFooterAccess(req)) return sendError(res, DENY, 403);
    const scope = await resolveAdminScope(req, req.body?.storeCode ?? req.query.store_code);
    const content = await footerContent.deleteFooterContent(scope);
    sendSuccess(res, { footer: content, message: 'Footer reset to default.' });
  } catch (err) {
    sendError(res, err.message || 'Unable to reset footer content.', err.statusCode || 500);
  }
}

/** Upload one footer image (payment icon / logo) to S3, return its public URL. */
async function uploadImage(req, res) {
  try {
    if (!hasFooterAccess(req)) return sendError(res, DENY, 403);
    const file = req.file;
    if (!file || !file.buffer) return sendError(res, 'No image file provided.', 400);
    const url = await uploadImageBuffer(file.buffer, {
      contentType: file.mimetype,
      keyPrefix: 'footer-content',
    });
    return sendSuccess(res, { url });
  } catch (err) {
    return sendError(res, err.message || 'Upload failed.', err.statusCode || 500);
  }
}

module.exports = {
  getPublicConfig,
  getSettingsAdmin,
  updateSettingsAdmin,
  deleteSettingsAdmin,
  uploadImage,
};

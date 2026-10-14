const homePageService = require('../../services/homePage');
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
    return homePageService.resolveScopeFromStoreCode(req.storeCode);
  }
  // Master / distributor admin must name the store (home content is store-specific).
  const code = storeCodeInput != null ? String(storeCodeInput).trim() : '';
  if (!code) {
    const err = new Error('Select a store to manage its home page.');
    err.statusCode = 400;
    throw err;
  }
  return homePageService.resolveScopeFromStoreCode(code);
}

/** Public: used by the guest website. Resolves the store from ?store_code / host. */
async function getPublicConfig(req, res) {
  try {
    const scope = await homePageService.resolveScopeFromStoreCode(req.query.store_code);
    const content = await homePageService.getHomePageContent(scope);
    sendSuccess(res, { homePage: content });
  } catch (err) {
    sendError(res, err.message || 'Unable to load home page content.', err.statusCode || 500);
  }
}

async function getSettingsAdmin(req, res) {
  try {
    if (!assertCanEdit(req)) {
      return sendError(res, 'You do not have permission to manage the home page.', 403);
    }
    const scope = await resolveAdminScope(req, req.query.store_code);
    const content = await homePageService.getHomePageContent(scope);
    sendSuccess(res, { homePage: content, scope });
  } catch (err) {
    sendError(res, err.message || 'Unable to load home page content.', err.statusCode || 500);
  }
}

async function updateSettingsAdmin(req, res) {
  try {
    if (!assertCanEdit(req)) {
      return sendError(res, 'You do not have permission to manage the home page.', 403);
    }
    const storeCodeInput = req.body?.storeCode ?? req.query.store_code;
    const scope = await resolveAdminScope(req, storeCodeInput);
    const payload = req.body?.homePage ?? req.body ?? {};
    const updatedBy = req.user?.username || req.user?.email || null;
    const content = await homePageService.updateHomePageContent(payload, scope, updatedBy);
    sendSuccess(res, { homePage: content, message: 'Home page saved.' });
  } catch (err) {
    sendError(res, err.message || 'Unable to save home page content.', err.statusCode || 500);
  }
}

async function deleteSettingsAdmin(req, res) {
  try {
    if (!assertCanEdit(req)) {
      return sendError(res, 'You do not have permission to manage the home page.', 403);
    }
    const storeCodeInput = req.body?.storeCode ?? req.query.store_code;
    const scope = await resolveAdminScope(req, storeCodeInput);
    const content = await homePageService.deleteHomePageContent(scope);
    sendSuccess(res, { homePage: content, message: 'Home page reset to default.' });
  } catch (err) {
    sendError(res, err.message || 'Unable to reset home page content.', err.statusCode || 500);
  }
}

/** Upload one home page image to S3, return its public URL. */
async function uploadImage(req, res) {
  try {
    if (!assertCanEdit(req)) {
      return sendError(res, 'You do not have permission to manage the home page.', 403);
    }
    const file = req.file;
    if (!file || !file.buffer) {
      return sendError(res, 'No image file provided.', 400);
    }
    const url = await uploadImageBuffer(file.buffer, {
      contentType: file.mimetype,
      keyPrefix: 'home-page',
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

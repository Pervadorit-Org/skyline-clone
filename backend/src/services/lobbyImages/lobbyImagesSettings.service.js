'use strict';

const db = require('../../db/models');

const KEY = 'lobby_images';
const MAX_BANNERS = 10;

const DEFAULTS = {
  dailyCardBg: '',
  spinCardBg: '',
  banners: []
};

function cleanUrl(value, label) {
  const url = typeof value === 'string' ? value.trim() : '';
  if (!url) return '';
  if (url.length > 2048 || !/^(https?:\/\/|\/)/i.test(url) || /^\/\//.test(url)) {
    const err = new Error(`${label} must be an http(s) URL or a site path starting with /.`);
    err.statusCode = 400;
    throw err;
  }
  return url;
}

function normalizePayload(payload = {}) {
  const rawBanners = Array.isArray(payload.banners) ? payload.banners : [];
  if (rawBanners.length > MAX_BANNERS) {
    const err = new Error(`At most ${MAX_BANNERS} banners are allowed.`);
    err.statusCode = 400;
    throw err;
  }
  const banners = [];
  rawBanners.forEach((b, i) => {
    const desktop = cleanUrl(b?.desktop, `Banner ${i + 1} desktop image`);
    const mobile = cleanUrl(b?.mobile, `Banner ${i + 1} mobile image`);
    if (!desktop && !mobile) return;
    banners.push({
      id: String(b?.id || `banner-${i + 1}`).slice(0, 40),
      desktop: desktop || mobile,
      mobile: mobile || desktop,
      href: cleanUrl(b?.href, `Banner ${i + 1} link`),
      label: String(b?.label || '').trim().slice(0, 120)
    });
  });
  return {
    dailyCardBg: cleanUrl(payload.dailyCardBg, 'Daily Rewards card image'),
    spinCardBg: cleanUrl(payload.spinCardBg, 'Spin the Wheel card image'),
    banners
  };
}

function parseRow(row) {
  if (!row?.value) return null;
  try {
    const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    return parsed && typeof parsed === 'object' ? normalizePayload(parsed) : null;
  } catch (_) {
    return null;
  }
}

async function readFromSetting(distributorCode, storeCode) {
  const row = await db.Setting.findOne({
    where: { key: KEY, distributorCode: distributorCode ?? null, storeCode: storeCode ?? null }
  });
  return parseRow(row);
}

/** Saved images for the store (empty defaults until an admin saves some). */
async function getLobbyImages(scope = null) {
  if (scope && (scope.distributorCode != null || scope.storeCode != null)) {
    const own = await readFromSetting(scope.distributorCode, scope.storeCode);
    if (own) return own;
  }
  return { ...DEFAULTS, banners: [] };
}

async function updateLobbyImages(payload, scope) {
  const settings = normalizePayload(payload);
  const distributorCode = scope && scope.distributorCode != null ? scope.distributorCode : null;
  const storeCode = scope && scope.storeCode != null ? scope.storeCode : null;
  const [row] = await db.Setting.findOrCreate({
    where: { key: KEY, distributorCode, storeCode },
    defaults: { key: KEY, distributorCode, storeCode, value: JSON.stringify(settings) }
  });
  await row.update({ value: JSON.stringify(settings) });
  return settings;
}

async function resetLobbyImages(scope) {
  await db.Setting.destroy({
    where: {
      key: KEY,
      distributorCode: scope?.distributorCode ?? null,
      storeCode: scope?.storeCode ?? null
    }
  });
  return { ...DEFAULTS, banners: [] };
}

module.exports = { KEY, getLobbyImages, updateLobbyImages, resetLobbyImages };

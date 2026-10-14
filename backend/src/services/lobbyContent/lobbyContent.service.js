'use strict';

/**
 * Signed-in lobby content (banners, row order / titles / counts, picked games, studio artwork),
 * stored per store in the generic `settings` table under the key `lobby_content`
 * (NO new table/column — one JSON row per store, same pattern as home_page_content / footer_content).
 *
 * The value holds only what an admin changed. The frontend merges it over the built-in lobby layout
 * (src/config/lobbyDefaults.js), so an empty/missing row keeps today's lobby.
 */
const { Op } = require('sequelize');
const db = require('../../db/models');
const { ROLES } = require('../../constants/roles');

const KEY = 'lobby_content';

const MAX = { text: 200, ids: 60, banners: 12, sections: 60, textKeys: 400, textValue: 400 };

const TEXT_ROOTS = new Set([
  'banners', 'promoCards', 'categories', 'recentWinsTitle', 'packages', 'providers', 'invite', 'deals',
  'exclusive', 'pick', 'winners', 'sidebar', 'header', 'brand',
]);
const LINK_KEY = /(^|\.)(href|art|bg|image|logo|to|[a-zA-Z]*Href)$/;
const BAD_SEGMENT = new Set(['__proto__', 'constructor', 'prototype']);

/** Dotted path into the lobby config, or '' when it is not an allowed path. */
function textPath(v) {
  const p = String(v || '').trim();
  if (!/^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9-]+){0,3}$/.test(p)) return '';
  const parts = p.split('.');
  if (!TEXT_ROOTS.has(parts[0]) || parts.some((x) => BAD_SEGMENT.has(x))) return '';
  return p;
}

function offKey(v) {
  const k = String(v || '').trim().toLowerCase();
  return /^[a-z]+:[a-z0-9_./-]{1,60}$/.test(k) ? k : '';
}

function str(v, max = MAX.text) {
  if (v == null) return '';
  return String(v).trim().slice(0, max);
}

function boolean(v) {
  return v === true || v === 'true' || v === 1 || v === '1';
}

/** Link / image reference: '', a site path like /casino, or an http(s) URL. */
function link(v) {
  if (v == null) return '';
  const s = String(v).trim();
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//')) return s.slice(0, 1024);
  let u;
  try {
    u = new URL(s);
  } catch {
    const err = new Error(`"${s.slice(0, 60)}" must be a site path (/…) or an http(s) URL.`);
    err.statusCode = 400;
    throw err;
  }
  if (!['http:', 'https:'].includes(u.protocol)) {
    const err = new Error('Links must use http:// or https:// (or start with /).');
    err.statusCode = 400;
    throw err;
  }
  return u.toString();
}

const sectionId = (v) => {
  const id = str(v, 40).toLowerCase();
  return /^[a-z0-9][a-z0-9-]*$/.test(id) ? id : '';
};

function idList(v) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((x) => str(x, 120)).filter(Boolean))].slice(0, MAX.ids);
}

/** Keep only known shapes with valid types. Throws (400) on a bad URL. */
function sanitizeContent(payload = {}) {
  const out = {};

  if (Array.isArray(payload.banners)) {
    out.banners = payload.banners
      .slice(0, MAX.banners)
      .map((b, i) => ({
        id: sectionId(b?.id) || `banner-${i + 1}`,
        label: str(b?.label, 80),
        href: link(b?.href),
        desktop: link(b?.desktop),
        mobile: link(b?.mobile),
      }))
      .filter((b) => b.desktop || b.mobile);
  }

  const s = payload.sections;
  if (s && typeof s === 'object') {
    const sections = {};
    if (Array.isArray(s.order)) sections.order = s.order.map(sectionId).filter(Boolean).slice(0, MAX.sections);
    if (s.enabled && typeof s.enabled === 'object') {
      sections.enabled = {};
      Object.keys(s.enabled).slice(0, MAX.sections).forEach((k) => {
        const id = sectionId(k);
        if (id) sections.enabled[id] = boolean(s.enabled[k]);
      });
    }
    if (s.titles && typeof s.titles === 'object') {
      sections.titles = {};
      Object.keys(s.titles).slice(0, MAX.sections).forEach((k) => {
        const id = sectionId(k);
        const t = str(s.titles[k], 80);
        if (id && t) sections.titles[id] = t;
      });
    }
    if (s.counts && typeof s.counts === 'object') {
      sections.counts = {};
      Object.keys(s.counts).slice(0, MAX.sections).forEach((k) => {
        const id = sectionId(k);
        const n = Math.round(Number(s.counts[k]));
        if (id && Number.isFinite(n) && n > 0) sections.counts[id] = Math.min(60, n);
      });
    }
    if (Object.keys(sections).length) out.sections = sections;
  }

  if (payload.picks && typeof payload.picks === 'object') {
    out.picks = {};
    Object.keys(payload.picks).slice(0, MAX.sections).forEach((k) => {
      const id = sectionId(k);
      const list = idList(payload.picks[k]);
      if (id && list.length) out.picks[id] = list;
    });
  }

  if (payload.featured && typeof payload.featured === 'object') {
    out.featured = {};
    Object.keys(payload.featured).slice(0, MAX.sections).forEach((k) => {
      const id = sectionId(k);
      const f = payload.featured[k] || {};
      const row = { brand: str(f.brand, 80), bgDesktop: link(f.bgDesktop), bgMobile: link(f.bgMobile) };
      if (id && (row.brand || row.bgDesktop || row.bgMobile)) out.featured[id] = row;
    });
  }

  if (payload.hiddenGames != null) out.hiddenGames = idList(payload.hiddenGames);

  // Text overrides: { "promoCards.0.title": "…", "sidebar.promotions": "…" } — dotted paths into the built-in
  // lobby config / sidebar / header labels. Only known roots; links and images are validated.
  if (payload.text && typeof payload.text === 'object') {
    out.text = {};
    Object.keys(payload.text).slice(0, MAX.textKeys).forEach((k) => {
      const path = textPath(k);
      if (!path) return;
      const raw = payload.text[k];
      if (raw == null || String(raw).trim() === '') return;
      out.text[path] = LINK_KEY.test(path) ? link(raw) : str(raw, MAX.textValue);
    });
  }

  // Items switched off: ["tab:bingo", "card:daily", "sidebar:promotions", "header:blog", "panel:packages"]
  if (Array.isArray(payload.off)) {
    out.off = [...new Set(payload.off.map(offKey).filter(Boolean))].slice(0, MAX.textKeys);
  }

  if (Array.isArray(payload.providers)) {
    out.providers = payload.providers
      .slice(0, 24)
      .map((p) => ({ name: str(p?.name, 80), image: link(p?.image) }))
      .filter((p) => p.name && p.image);
  }

  if (Array.isArray(payload.sidebarLinks)) {
    out.sidebarLinks = payload.sidebarLinks
      .slice(0, 10)
      .map((l) => ({ label: str(l?.label, 60), to: link(l?.to) }))
      .filter((l) => l.label && l.to);
  }

  if (payload.popularity && typeof payload.popularity === 'object') {
    const days = Math.round(Number(payload.popularity.days));
    out.popularity = {
      mode: payload.popularity.mode === 'off' ? 'off' : 'auto',
      days: Number.isFinite(days) ? Math.min(365, Math.max(1, days)) : 30,
    };
  }

  return out;
}

/* ------------------------------ persistence ------------------------------ */

function parseRow(row) {
  if (!row?.value) return null;
  try {
    const parsed = JSON.parse(row.value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function readFromSetting(distributorCode, storeCode) {
  const row = await db.Setting.findOne({
    where: { key: KEY, distributorCode: distributorCode ?? null, storeCode: storeCode ?? null },
  });
  return parseRow(row);
}

async function readFromStoreCode(storeCode) {
  const norm = storeCode && String(storeCode).trim();
  if (!norm) return null;
  const row = await db.Setting.findOne({
    where: { key: KEY, storeCode: { [Op.iLike]: norm } },
    order: [['updated_at', 'DESC']],
  });
  return parseRow(row);
}

/** Stored content for a scope, or {} when the store has nothing saved yet. */
async function getLobbyContent(scope = null) {
  if (scope && (scope.distributorCode != null || scope.storeCode != null)) {
    const exact = await readFromSetting(scope.distributorCode, scope.storeCode);
    if (exact) return exact;
    if (scope.storeCode) {
      const byCode = await readFromStoreCode(scope.storeCode);
      if (byCode) return byCode;
    }
    return {};
  }
  const global = await readFromSetting(null, null);
  return global || {};
}

async function updateLobbyContent(payload, scope = null, updatedBy = null) {
  const content = sanitizeContent(payload);
  content.updatedAt = new Date().toISOString();
  if (updatedBy) content.updatedBy = String(updatedBy).slice(0, 120);

  const distributorCode = scope && scope.distributorCode != null ? scope.distributorCode : null;
  const storeCode = scope && scope.storeCode != null ? scope.storeCode : null;

  const [row] = await db.Setting.findOrCreate({
    where: { key: KEY, distributorCode, storeCode },
    defaults: { key: KEY, distributorCode, storeCode, value: JSON.stringify(content) },
  });
  await row.update({ value: JSON.stringify(content) });
  return content;
}

async function deleteLobbyContent(scope = null) {
  const distributorCode = scope && scope.distributorCode != null ? scope.distributorCode : null;
  const storeCode = scope && scope.storeCode != null ? scope.storeCode : null;
  await db.Setting.destroy({ where: { key: KEY, distributorCode, storeCode } });
  return {};
}

/** store_code (string) → { distributorCode, storeCode }. Works even if the store has no admin row yet. */
async function resolveScopeFromStoreCode(storeCode) {
  const norm = storeCode && String(storeCode).trim();
  if (!norm) return null;
  const storeAdmin = await db.User.findOne({
    where: { role: ROLES.STORE_ADMIN, storeCode: { [Op.iLike]: norm }, storeRoleId: null },
    attributes: ['distributorCode', 'storeCode'],
    raw: true,
  });
  if (storeAdmin) {
    return {
      distributorCode: storeAdmin.distributorCode ?? null,
      storeCode: storeAdmin.storeCode ?? norm,
    };
  }
  return { distributorCode: null, storeCode: norm };
}

module.exports = {
  KEY,
  sanitizeContent,
  getLobbyContent,
  updateLobbyContent,
  deleteLobbyContent,
  resolveScopeFromStoreCode,
};

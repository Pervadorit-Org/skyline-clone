'use strict';

/**
 * Guest home page content, stored per store in the generic `settings` table
 * under the key `home_page_content` (NO new table/column — one JSON row per store,
 * same pattern as social_links / dashboard_slideshow_settings).
 *
 * The value holds only the fields an admin edits. The frontend merges this over
 * its own built-in defaults (src/config/homeConfig.js), so an empty/missing row
 * keeps today's design, and any field left out falls back to the default.
 */
const { Op } = require('sequelize');
const db = require('../../db/models');
const { ROLES } = require('../../constants/roles');

const KEY = 'home_page_content';

const SECTION_KEYS = [
  'hero1',
  'hero2',
  'intro',
  'categoryStrip',
  'topGames',
  'platforms',
  'reasons',
  'providers',
  'testimonials',
  'banner1',
  'featureCards',
  'noPurchase',
  'banner2',
];

const MAX = {
  text: 400,
  long: 4000,
  list: 60,
  color: 32,
};

/* ----------------------------- field helpers ----------------------------- */

function str(v, max = MAX.text) {
  if (v == null) return '';
  return String(v).slice(0, max);
}

function boolean(v) {
  return v === true || v === 'true' || v === 1 || v === '1';
}

function intIn(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Link / image reference: '', a site path like /casino, or an http(s) URL. */
function link(v) {
  if (v == null) return '';
  const s = String(v).trim();
  if (!s) return '';
  if (s.startsWith('/')) return s.slice(0, 1024);
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

function arr(v) {
  return Array.isArray(v) ? v.slice(0, MAX.list) : [];
}

/** Only copy a key through when the admin actually sent it (keeps the row sparse). */
function pick(src, out, key, fn) {
  if (src && Object.prototype.hasOwnProperty.call(src, key) && src[key] != null) {
    out[key] = fn(src[key]);
  }
}

function side(v) {
  return String(v) === 'left' ? 'left' : 'right';
}

/* --------------------------- section sanitizers --------------------------- */

const SANITIZE = {
  hero1(s) {
    const o = {};
    pick(s, o, 'bgDesktop', link);
    pick(s, o, 'bgMobile', link);
    pick(s, o, 'logo', link);
    pick(s, o, 'eyebrow', (x) => str(x));
    pick(s, o, 'offer', (x) => str(x));
    pick(s, o, 'ctaLabel', (x) => str(x, 60));
    pick(s, o, 'ctaHref', link);
    return o;
  },
  hero2(s) {
    const o = {};
    pick(s, o, 'imageDesktop', link);
    pick(s, o, 'imageMobile', link);
    pick(s, o, 'alt', (x) => str(x));
    pick(s, o, 'href', link);
    return o;
  },
  intro(s) {
    const o = {};
    ['line1', 'highlight', 'line1b', 'line2', 'subtitle'].forEach((k) => pick(s, o, k, (x) => str(x)));
    return o;
  },
  categoryStrip(s) {
    const o = {};
    if (s && s.items != null) {
      o.items = arr(s.items).map((it) => ({
        label: str(it?.label, 60),
        emoji: str(it?.emoji, 16),
        icon: it?.icon != null ? str(it.icon, 32) : undefined,
        href: link(it?.href),
      }));
    }
    return o;
  },
  topGames(s) {
    const o = {};
    pick(s, o, 'title', (x) => str(x, 120));
    pick(s, o, 'gameHref', link);
    if (s && s.games != null) {
      o.games = arr(s.games).map((g) => ({ name: str(g?.name, 120), image: link(g?.image) }));
    }
    return o;
  },
  platforms(s) {
    const o = {};
    pick(s, o, 'title', (x) => str(x, 120));
    pick(s, o, 'limit', (x) => intIn(x, 1, 60, 15));
    if (s && s.items != null) {
      o.items = arr(s.items).map((g) => ({
        name: str(g?.name, 120),
        image: link(g?.image),
        isNew: boolean(g?.isNew),
        href: g?.href != null ? link(g.href) : undefined,
      }));
    }
    return o;
  },
  reasons(s) {
    const o = {};
    pick(s, o, 'titleLead', (x) => str(x, 120));
    pick(s, o, 'title', (x) => str(x, 120));
    if (s && s.cards != null) {
      o.cards = arr(s.cards).map((c) => ({
        icon: link(c?.icon),
        title: str(c?.title, 120),
        body: str(c?.body, MAX.long),
      }));
    }
    return o;
  },
  providers(s) {
    const o = {};
    pick(s, o, 'title', (x) => str(x, 120));
    if (s && s.logos != null) {
      o.logos = arr(s.logos).map((l) => ({ name: str(l?.name, 120), image: link(l?.image) }));
    }
    return o;
  },
  testimonials(s) {
    const o = {};
    pick(s, o, 'title', (x) => str(x, 120));
    pick(s, o, 'subtitle', (x) => str(x, 200));
    if (s && s.items != null) {
      o.items = arr(s.items).map((t) => ({
        name: str(t?.name, 120),
        quote: str(t?.quote, MAX.long),
        stars: intIn(t?.stars, 1, 5, 5),
      }));
    }
    return o;
  },
  banner1(s) {
    const o = {};
    pick(s, o, 'bg', link);
    pick(s, o, 'character', link);
    pick(s, o, 'characterMobile', link);
    pick(s, o, 'title', (x) => str(x, 200));
    pick(s, o, 'body', (x) => str(x, MAX.long));
    pick(s, o, 'ctaLabel', (x) => str(x, 60));
    pick(s, o, 'ctaHref', link);
    pick(s, o, 'characterSide', side);
    return o;
  },
  featureCards(s) {
    // `s` is the array itself here.
    return arr(s).map((c) => ({
      icon: str(c?.icon, 16),
      title: str(c?.title, 120),
      body: str(c?.body, MAX.long),
    }));
  },
  noPurchase(s) {
    const o = {};
    pick(s, o, 'title', (x) => str(x, 200));
    pick(s, o, 'body', (x) => str(x, MAX.long));
    pick(s, o, 'character', link);
    pick(s, o, 'ctaLabel', (x) => str(x, 60));
    pick(s, o, 'ctaLabelMobile', (x) => str(x, 60));
    pick(s, o, 'ctaHref', link);
    return o;
  },
  banner2(s) {
    const o = {};
    pick(s, o, 'bgColor', (x) => str(x, MAX.color));
    pick(s, o, 'character', link);
    pick(s, o, 'title', (x) => str(x, 200));
    pick(s, o, 'body', (x) => str(x, MAX.long));
    pick(s, o, 'ctaLabel', (x) => str(x, 60));
    pick(s, o, 'ctaHref', link);
    pick(s, o, 'characterSide', side);
    return o;
  },
};

function sanitizeSections(sections) {
  if (!sections || typeof sections !== 'object') return undefined;
  const out = {};
  if (Array.isArray(sections.order)) {
    out.order = sections.order.filter((k) => SECTION_KEYS.includes(k)).slice(0, SECTION_KEYS.length);
  }
  if (sections.enabled && typeof sections.enabled === 'object') {
    out.enabled = {};
    SECTION_KEYS.forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(sections.enabled, k)) {
        out.enabled[k] = boolean(sections.enabled[k]);
      }
    });
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Keep only known sections/fields with valid types. Throws (400) on a bad URL.
 */
function sanitizeContent(payload = {}) {
  const out = {};
  const sections = sanitizeSections(payload.sections);
  if (sections) out.sections = sections;

  for (const key of SECTION_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;
    const cleaned = SANITIZE[key](payload[key]);
    // featureCards is an array; sections are objects.
    if (Array.isArray(cleaned)) {
      out[key] = cleaned;
    } else if (cleaned && Object.keys(cleaned).length) {
      out[key] = cleaned;
    }
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
async function getHomePageContent(scope = null) {
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

async function updateHomePageContent(payload, scope = null, updatedBy = null) {
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

async function deleteHomePageContent(scope = null) {
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
  SECTION_KEYS,
  sanitizeContent,
  getHomePageContent,
  updateHomePageContent,
  deleteHomePageContent,
  resolveScopeFromStoreCode,
};

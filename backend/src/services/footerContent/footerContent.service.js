'use strict';

/**
 * Website footer content (payment icons, brand text, link panels, contact,
 * compliance notes), stored per store in the generic `settings` table under the
 * key `footer_content` — NO new table/column; one JSON row per store, same
 * pattern as home_page_content / social_links.
 *
 * Only what an admin edits is stored. The website merges it over its own
 * built-in defaults (frontend/src/config/footerConfig.js), so an empty/missing
 * row keeps today's footer and any field left out falls back to the default.
 * (CMS pages from "Footer links" are separate: footer_menus / footer_pages.)
 */
const { Op } = require('sequelize');
const db = require('../../db/models');
const { resolveScopeFromStoreCode } = require('../homePage');

const KEY = 'footer_content';

const SECTION_KEYS = ['payments', 'brand', 'platforms', 'pages', 'contact', 'compliance'];

const MAX = { text: 400, long: 4000, list: 40 };

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

function badInput(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

/** Link / image reference: '', a site path like /terms, or an http(s) URL. */
function link(v) {
  if (v == null) return '';
  const s = String(v).trim();
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//')) return s.slice(0, 1024);
  let u;
  try {
    u = new URL(s);
  } catch {
    throw badInput(`"${s.slice(0, 60)}" must be a site path (/…) or an http(s) URL.`);
  }
  if (!['http:', 'https:'].includes(u.protocol)) {
    throw badInput('Links must use http:// or https:// (or start with /).');
  }
  return u.toString();
}

function email(v) {
  const s = str(v, 200).trim();
  if (!s) return '';
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s)) {
    throw badInput(`"${s.slice(0, 60)}" is not a valid email address.`);
  }
  return s;
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

/** { label, href } rows: rows with neither value are dropped. */
function linkRows(v) {
  return arr(v)
    .map((it) => ({ label: str(it?.label, 120).trim(), href: link(it?.href) }))
    .filter((it) => it.label || it.href);
}

/* --------------------------- section sanitizers --------------------------- */

const SANITIZE = {
  payments(s) {
    const o = {};
    pick(s, o, 'title', (x) => str(x, 120));
    if (s && s.items != null) {
      o.items = arr(s.items)
        .map((it) => ({ name: str(it?.name, 80).trim(), image: link(it?.image) }))
        .filter((it) => it.name || it.image);
    }
    return o;
  },
  brand(s) {
    const o = {};
    pick(s, o, 'logo', link);
    pick(s, o, 'text', (x) => str(x, MAX.long));
    return o;
  },
  platforms(s) {
    const o = {};
    pick(s, o, 'title', (x) => str(x, 120));
    pick(s, o, 'max', (x) => intIn(x, 2, 40, 14));
    // Extra platform links (label + link, optional tile image) shown after the platform pages.
    if (s && s.items != null) {
      o.items = arr(s.items)
        .map((it) => ({ label: str(it?.label, 120).trim(), href: link(it?.href), image: link(it?.image) }))
        .filter((it) => it.label || it.href);
    }
    return o;
  },
  pages(s) {
    const o = {};
    pick(s, o, 'title', (x) => str(x, 120));
    pick(s, o, 'includeCmsPages', boolean);
    if (s && s.items != null) o.items = linkRows(s.items);
    return o;
  },
  contact(s) {
    const o = {};
    pick(s, o, 'title', (x) => str(x, 120));
    pick(s, o, 'email', email);
    pick(s, o, 'chatLabel', (x) => str(x, 60));
    if (s && s.socials && typeof s.socials === 'object') {
      o.socials = {};
      ['instagram', 'twitter', 'facebook', 'discord'].forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(s.socials, k)) o.socials[k] = link(s.socials[k]);
      });
    }
    return o;
  },
  compliance(s) {
    const o = {};
    if (s && s.notes != null) {
      o.notes = arr(s.notes)
        .map((n) => str(typeof n === 'string' ? n : n?.text, MAX.long).trim())
        .filter(Boolean);
    }
    pick(s, o, 'copyright', (x) => str(x, 300));
    return o;
  },
};

function sanitizeShow(show) {
  if (!show || typeof show !== 'object') return undefined;
  const out = {};
  SECTION_KEYS.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(show, k)) out[k] = boolean(show[k]);
  });
  return Object.keys(out).length ? out : undefined;
}

/** Keep only known sections/fields with valid types. Throws (400) on a bad URL/email. */
function sanitizeContent(payload = {}) {
  const out = {};
  const show = sanitizeShow(payload.show);
  if (show) out.show = show;

  for (const key of SECTION_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;
    const cleaned = SANITIZE[key](payload[key]);
    if (cleaned && Object.keys(cleaned).length) out[key] = cleaned;
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

async function readExact(distributorCode, storeCode) {
  const row = await db.Setting.findOne({
    where: { key: KEY, distributorCode: distributorCode ?? null, storeCode: storeCode ?? null },
  });
  return parseRow(row);
}

async function readByStoreCode(storeCode) {
  const norm = storeCode && String(storeCode).trim();
  if (!norm) return null;
  const row = await db.Setting.findOne({
    where: { key: KEY, storeCode: { [Op.iLike]: norm } },
    order: [['updated_at', 'DESC']],
  });
  return parseRow(row);
}

/** Stored content for a scope, or {} when the store has nothing saved yet. */
async function getFooterContent(scope = null) {
  if (scope && (scope.distributorCode != null || scope.storeCode != null)) {
    const exact = await readExact(scope.distributorCode, scope.storeCode);
    if (exact) return exact;
    if (scope.storeCode) {
      const byCode = await readByStoreCode(scope.storeCode);
      if (byCode) return byCode;
    }
    return {};
  }
  return (await readExact(null, null)) || {};
}

async function updateFooterContent(payload, scope = null, updatedBy = null) {
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

async function deleteFooterContent(scope = null) {
  const distributorCode = scope && scope.distributorCode != null ? scope.distributorCode : null;
  const storeCode = scope && scope.storeCode != null ? scope.storeCode : null;
  await db.Setting.destroy({ where: { key: KEY, distributorCode, storeCode } });
  return {};
}

module.exports = {
  KEY,
  SECTION_KEYS,
  sanitizeContent,
  getFooterContent,
  updateFooterContent,
  deleteFooterContent,
  resolveScopeFromStoreCode,
};

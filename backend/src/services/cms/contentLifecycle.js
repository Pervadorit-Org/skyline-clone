'use strict';

const { Op } = require('sequelize');

/**
 * Soft-delete and permanent-redirect columns are not part of the database, so these helpers are
 * deliberately inert: everything is "live", deletes are real deletes and there are no 301 hops.
 */
function supportsLifecycle() {
  return false;
}

function deletionWhere(status) {
  // The "Deleted" list is always empty; "live" applies no filter.
  if (String(status || '').trim().toLowerCase() === 'deleted') return { id: { [Op.is]: null } };
  return {};
}

function redirectPatch() {
  return undefined;
}

function redirectResult() {
  return null;
}

function lifecyclePlain() {
  return {};
}

function absoluteTarget(origin, dest) {
  const text = String(dest || '').trim();
  if (/^https?:\/\//i.test(text)) return text;
  const base = String(origin || '').replace(/\/$/, '');
  const path = text.startsWith('/') ? text : `/${text}`;
  return `${base}${path}`;
}

module.exports = {
  Op,
  supportsLifecycle,
  deletionWhere,
  redirectPatch,
  redirectResult,
  lifecyclePlain,
  absoluteTarget
};

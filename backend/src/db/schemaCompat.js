'use strict';

/**
 * Lets the CMS models (footer, legal, game SEO pages) run on a database that has not had the newest
 * migrations yet. At startup it reads the real columns of those tables; any model attribute whose
 * column is missing (deleted_at, canonical_url, ...) is dropped from the model and stripped from
 * find queries, so the API answers instead of failing with "column ... does not exist".
 * Once the migrations are applied nothing is missing and this does nothing.
 */

const { Op } = require('sequelize');

const CMS_MODELS = ['FooterMenu', 'FooterPage', 'LegalPage', 'GameSeoPage'];

// modelName -> Set of attribute names whose column is missing in the database
const missing = new Map();
const hooked = new Set();

function missingAttrs(modelName) {
  return missing.get(modelName) || new Set();
}

function columnMissing(modelName, attr) {
  return missingAttrs(modelName).has(attr);
}

/** Drop conditions on missing attributes. A "deleted rows" condition can match nothing, so it matches nothing. */
function cleanWhere(where, attrs) {
  if (!where || typeof where !== 'object') return where;
  const out = { ...where };
  let impossible = false;
  for (const key of Object.keys(out)) {
    if (!attrs.has(key)) continue;
    const value = out[key];
    const wantsNull = value === null || value === undefined || value?.[Op.is] === null || value?.[Op.eq] === null;
    if (!wantsNull) impossible = true;
    delete out[key];
  }
  if (impossible) out.id = null;
  return out;
}

function cleanOptions(model, options) {
  if (!options || typeof options !== 'object') return;
  const attrs = missingAttrs(model.name);
  if (attrs.size) {
    if (Array.isArray(options.attributes)) {
      options.attributes = options.attributes.filter((a) => !attrs.has(Array.isArray(a) ? a[1] : a));
    } else if (options.attributes && Array.isArray(options.attributes.include)) {
      options.attributes.include = options.attributes.include.filter((a) => !attrs.has(Array.isArray(a) ? a[1] : a));
    }
    if (options.where) options.where = cleanWhere(options.where, attrs);
  }
  const includes = options.include ? [].concat(options.include) : [];
  includes.forEach((inc) => {
    if (inc && inc.model) cleanOptions(inc.model, inc);
  });
}

async function applySchemaCompat(db) {
  const { sequelize } = db;
  const tables = CMS_MODELS.map((name) => db[name]).filter(Boolean).map((m) => {
    const t = m.getTableName();
    return typeof t === 'string' ? t : t.tableName;
  });
  if (!tables.length) return [];
  const [rows] = await sequelize.query(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_name IN (:tables) AND table_schema = ANY (current_schemas(false))`,
    { replacements: { tables } }
  );
  const columnsByTable = new Map();
  rows.forEach((r) => {
    if (!columnsByTable.has(r.table_name)) columnsByTable.set(r.table_name, new Set());
    columnsByTable.get(r.table_name).add(r.column_name);
  });

  const report = [];
  CMS_MODELS.forEach((name) => {
    const model = db[name];
    if (!model || hooked.has(name)) return;
    const tableName = typeof model.getTableName() === 'string' ? model.getTableName() : model.getTableName().tableName;
    const columns = columnsByTable.get(tableName);
    if (!columns) return; // table itself is absent: leave it to the migrations
    const gone = new Set();
    Object.entries(model.rawAttributes).forEach(([attr, def]) => {
      if (!columns.has(def.field || attr)) gone.add(attr);
    });
    if (!gone.size) return;
    hooked.add(name);
    missing.set(name, gone);
    gone.forEach((attr) => model.removeAttribute(attr));
    model.addHook('beforeFind', (options) => cleanOptions(model, options));
    model.addHook('beforeCount', (options) => cleanOptions(model, options));
    report.push(`${tableName}: ${[...gone].join(', ')}`);
  });
  return report;
}

let ensured = null;

/** Runs applySchemaCompat once (also covers a startup run that failed); safe to await before CMS reads. */
function ensureSchemaCompat(db) {
  if (!ensured) {
    ensured = applySchemaCompat(db).catch(() => {
      ensured = null;
      return [];
    });
  }
  return ensured;
}

module.exports = { applySchemaCompat, ensureSchemaCompat, columnMissing };

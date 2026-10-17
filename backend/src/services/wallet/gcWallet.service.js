'use strict';

/**
 * Gold Coins (GC) wallet — uses ONLY existing tables:
 *   wallets            (currency_code = 'GC')
 *   wallet_ledger      (asset_type = 'GC', unique idempotency_key)
 *   user_transactions  (currency_code = 'GC')
 *   settings           (per-user GC/SC mode: key = wallet_currency_mode_user_<id>)
 *
 * GC is for entertainment play only: it is never converted into SC and never withdrawn.
 * Only stores listed in GC_STORE_CODES use it; every other store keeps the SC-only flow untouched.
 */

const db = require('../../db/models');
const { roundMoney, ensureWallet } = require('./walletBuckets.service');
const { invalidateBalanceCache } = require('./balanceCache');

const GOLD_CURRENCY_CODE = 'GC';
const MODE_GC = 'GC';
const MODE_SC = 'SC';
const GC_STORE_CODES = new Set(['goldendragon']);
const MODE_KEY_PREFIX = 'wallet_currency_mode_user_';
const MODE_CACHE_MS = 3000;
const DEFAULT_MODE = MODE_GC;

const modeCache = new Map();
const storeCache = new Map();

function normalizeStoreCode(code) {
  return String(code || '').trim().toLowerCase();
}

function isGcStoreCode(storeCode) {
  return GC_STORE_CODES.has(normalizeStoreCode(storeCode));
}

function modeKey(userId) {
  return `${MODE_KEY_PREFIX}${userId}`;
}

/** Serialize concurrent work on one logical key inside the current DB transaction. */
async function advisoryLock(key, transaction) {
  if (!transaction) return;
  await db.sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:key))', {
    replacements: { key },
    transaction
  });
}

async function loadUserScope(userId, transaction) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id < 1) return null;
  const cached = storeCache.get(id);
  if (cached && Date.now() - cached.at < 60_000 && !transaction) return cached.value;
  const user = await db.User.findByPk(id, {
    attributes: ['userId', 'storeCode', 'distributorCode'],
    raw: true,
    transaction
  });
  const value = user
    ? { storeCode: normalizeStoreCode(user.storeCode), distributorCode: String(user.distributorCode || '').trim().toLowerCase() }
    : null;
  if (!transaction) storeCache.set(id, { at: Date.now(), value });
  return value;
}

async function isGcStoreUser(userId, transaction) {
  const scope = await loadUserScope(userId, transaction);
  return !!scope && isGcStoreCode(scope.storeCode);
}

function invalidateAfterCommit(userId, transaction) {
  if (transaction && typeof transaction.afterCommit === 'function') {
    transaction.afterCommit(() => invalidateBalanceCache(userId));
  } else {
    invalidateBalanceCache(userId);
  }
}

/* ------------------------------------------------------------------ */
/* Balances                                                            */
/* ------------------------------------------------------------------ */

async function ensureGcWallet(userId, transaction) {
  // Serialize first-time creation so two concurrent credits never create two GC rows.
  await advisoryLock(`gc_wallet:${userId}`, transaction);
  return ensureWallet(userId, GOLD_CURRENCY_CODE, transaction);
}

function usableGc(wallet) {
  if (!wallet) return 0;
  const balance = Number(wallet.balance) || 0;
  const frozen = Number(wallet.frozenBalance) || 0;
  return Math.max(0, roundMoney(balance - frozen));
}

async function getGcBalance(userId, transaction) {
  const wallet = await db.Wallet.findOne({
    where: { userId, currencyCode: GOLD_CURRENCY_CODE },
    transaction
  });
  const balance = wallet ? roundMoney(Number(wallet.balance) || 0) : 0;
  return { balance, usable: usableGc(wallet) };
}

/* ------------------------------------------------------------------ */
/* Credit / debit                                                      */
/* ------------------------------------------------------------------ */

/**
 * Credit GC once. Pass `idempotencyKey` for anything that can be retried (payment callbacks, claims).
 * Must run inside the caller's transaction so the credit, ledger row and history row commit together.
 *
 * @returns {Promise<{ credited: boolean, alreadyCredited: boolean, amount: number }>}
 */
async function creditGc(userId, amount, opts = {}) {
  const { transaction, type = 'gc_credit', description = null, metadata = {}, idempotencyKey = null } = opts;
  const credit = roundMoney(amount);
  if (!(credit > 0)) return { credited: false, alreadyCredited: false, amount: 0 };
  if (!transaction) {
    return db.sequelize.transaction((t) => creditGc(userId, amount, { ...opts, transaction: t }));
  }

  if (idempotencyKey) {
    await advisoryLock(`gc_credit:${idempotencyKey}`, transaction);
    const existing = await db.WalletLedger.findOne({ where: { idempotencyKey }, attributes: ['id'], transaction });
    if (existing) return { credited: false, alreadyCredited: true, amount: credit };
  }

  const wallet = await ensureGcWallet(userId, transaction);
  const before = roundMoney(Number(wallet.balance) || 0);
  // GC has no play-through: only `balance` moves.
  await wallet.increment({ balance: credit }, { transaction });
  await wallet.reload({ transaction });
  const after = roundMoney(Number(wallet.balance) || 0);

  await db.WalletLedger.create(
    {
      userId,
      entryType: 'CREDIT',
      assetType: GOLD_CURRENCY_CODE,
      amount: credit,
      balanceBefore: before,
      balanceAfter: after,
      reason: String(opts.reason || type).slice(0, 64),
      referenceType: String(opts.referenceType || 'GC_CREDIT').slice(0, 64),
      referenceId: String(opts.referenceId ?? idempotencyKey ?? userId).slice(0, 128),
      idempotencyKey: idempotencyKey || `gc_credit:${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`,
      metadata: { ...metadata, wallet: GOLD_CURRENCY_CODE }
    },
    { transaction }
  );

  await db.UserTransaction.create(
    {
      userId,
      type,
      amount: credit,
      currencyCode: GOLD_CURRENCY_CODE,
      description: description || `${credit} GC`,
      metadata: { ...metadata, wallet: GOLD_CURRENCY_CODE, direction: 'credit' }
    },
    { transaction }
  );
  invalidateAfterCommit(userId, transaction);

  return { credited: true, alreadyCredited: false, amount: credit, balanceAfter: after };
}

class InsufficientGcError extends Error {
  constructor() {
    super('Insufficient Gold Coins');
    this.name = 'InsufficientGcError';
    this.statusCode = 400;
    this.gcInsufficient = true;
  }
}

/** Debit GC. Throws InsufficientGcError when the usable GC balance is too low. */
async function debitGc(userId, amount, opts = {}) {
  const { transaction, type = 'gc_debit', description = null, metadata = {} } = opts;
  const debit = roundMoney(amount);
  if (!(debit > 0)) return { debited: false, amount: 0 };
  if (!transaction) {
    return db.sequelize.transaction((t) => debitGc(userId, amount, { ...opts, transaction: t }));
  }
  const wallet = await ensureGcWallet(userId, transaction);
  if (usableGc(wallet) + 0.0001 < debit) throw new InsufficientGcError();
  await wallet.decrement({ balance: debit }, { transaction });
  await wallet.reload({ transaction });
  const after = roundMoney(Number(wallet.balance) || 0);
  await db.UserTransaction.create(
    {
      userId,
      type,
      amount: debit,
      currencyCode: GOLD_CURRENCY_CODE,
      description: description || `${debit} GC`,
      metadata: { ...metadata, wallet: GOLD_CURRENCY_CODE, direction: 'debit' }
    },
    { transaction }
  );
  invalidateAfterCommit(userId, transaction);
  return { debited: true, amount: debit, balanceAfter: after };
}

/* ------------------------------------------------------------------ */
/* GC / SC mode (settings row per user, scoped to the user's store)    */
/* ------------------------------------------------------------------ */

function parseMode(raw) {
  try {
    const value = JSON.parse(raw);
    const mode = String(value?.mode || '').toUpperCase();
    return mode === MODE_SC || mode === MODE_GC ? mode : null;
  } catch {
    return null;
  }
}

async function getCurrencyMode(userId, { transaction = null } = {}) {
  const scope = await loadUserScope(userId, transaction);
  if (!scope || !isGcStoreCode(scope.storeCode)) return MODE_SC;
  const hit = modeCache.get(Number(userId));
  if (hit && Date.now() - hit.at < MODE_CACHE_MS && !transaction) return hit.mode;
  const row = await db.Setting.findOne({
    where: { key: modeKey(userId), distributorCode: scope.distributorCode, storeCode: scope.storeCode },
    attributes: ['value'],
    raw: true,
    transaction
  });
  const mode = parseMode(row?.value) || DEFAULT_MODE;
  if (!transaction) modeCache.set(Number(userId), { mode, at: Date.now() });
  return mode;
}

async function isGcMode(userId, transaction) {
  return (await getCurrencyMode(userId, { transaction })) === MODE_GC;
}

/** Switch the player's active currency. Never converts or moves any balance. */
async function setCurrencyMode(userId, requested) {
  const mode = String(requested || '').trim().toUpperCase();
  if (mode !== MODE_GC && mode !== MODE_SC) {
    const err = new Error('mode must be "GC" or "SC".');
    err.statusCode = 400;
    throw err;
  }
  const scope = await loadUserScope(userId);
  if (!scope || !isGcStoreCode(scope.storeCode)) {
    const err = new Error('Gold Coins are not available for your account.');
    err.statusCode = 400;
    throw err;
  }
  const value = JSON.stringify({ mode });
  await db.sequelize.transaction(async (t) => {
    await advisoryLock(`gc_mode:${userId}`, t);
    const where = { key: modeKey(userId), distributorCode: scope.distributorCode, storeCode: scope.storeCode };
    const row = await db.Setting.findOne({ where, transaction: t, lock: t.LOCK.UPDATE });
    if (row) await row.update({ value }, { transaction: t });
    else await db.Setting.create({ ...where, value }, { transaction: t });
  });
  modeCache.set(Number(userId), { mode, at: Date.now() });
  invalidateBalanceCache(userId);
  return mode;
}

/**
 * Mid-round mode switch guard: a win/refund for a round must settle in the wallet its bet used, even if the
 * player toggled GC/SC meanwhile. Looks at the round's earliest history row (user_transactions.metadata.roundId).
 * @returns {Promise<'GC'|'SC'|null>} null = no earlier row for this round (use the player's current mode)
 */
async function getRoundMode(userId, roundId, transaction) {
  if (!roundId) return null;
  const [row] = await db.sequelize.query(
    `SELECT currency_code AS "currencyCode" FROM user_transactions
      WHERE user_id = :userId AND metadata->>'roundId' = :roundId
      ORDER BY id ASC LIMIT 1`,
    { replacements: { userId, roundId: String(roundId) }, type: db.sequelize.QueryTypes.SELECT, transaction }
  );
  if (!row) return null;
  return row.currencyCode === GOLD_CURRENCY_CODE ? MODE_GC : MODE_SC;
}

/** Effective mode for a provider callback: the round's own mode when known, else the player's current mode. */
async function resolvePlayMode(userId, roundId, transaction) {
  if (!(await isGcStoreUser(userId, transaction))) return MODE_SC;
  return (await getRoundMode(userId, roundId, transaction)) || (await getCurrencyMode(userId, { transaction }));
}

/* ------------------------------------------------------------------ */
/* Slots (provider callbacks) in GC mode                               */
/* ------------------------------------------------------------------ */

/**
 * Apply a provider wallet delta against GC (bets debit, wins credit). Returns the usable GC afterwards.
 * `options.betAmount` (when present) is the amount that must be covered before a bet+win round.
 */
async function applyGcDelta(userId, delta, meta = {}, transaction, options = {}) {
  const change = roundMoney(delta);
  const type = meta?.type || 'slots';
  const description = meta?.description || 'Gold Coin play';
  const metadata = { ...(meta?.metadata || {}), walletImpact: { gc: change, psc: 0, bsc: 0, rsc: 0 } };
  const wallet = await ensureGcWallet(userId, transaction);
  const need = Number(options?.betAmount) > 0 ? roundMoney(options.betAmount) : Math.max(0, -change);
  if (need > 0 && usableGc(wallet) + 0.0001 < need) throw new InsufficientGcError();
  if (change === 0) return usableGc(wallet);

  if (change > 0) {
    await wallet.increment({ balance: change }, { transaction });
  } else {
    await wallet.decrement({ balance: -change }, { transaction });
  }
  await wallet.reload({ transaction });
  await db.UserTransaction.create(
    {
      userId,
      type,
      amount: Math.abs(change),
      currencyCode: GOLD_CURRENCY_CODE,
      description,
      metadata: { ...metadata, wallet: GOLD_CURRENCY_CODE }
    },
    { transaction }
  );
  invalidateAfterCommit(userId, transaction);
  return usableGc(wallet);
}

module.exports = {
  GOLD_CURRENCY_CODE,
  MODE_GC,
  MODE_SC,
  GC_STORE_CODES,
  InsufficientGcError,
  isGcStoreCode,
  isGcStoreUser,
  ensureGcWallet,
  usableGc,
  getGcBalance,
  creditGc,
  debitGc,
  getCurrencyMode,
  isGcMode,
  getRoundMode,
  resolvePlayMode,
  setCurrencyMode,
  applyGcDelta
};

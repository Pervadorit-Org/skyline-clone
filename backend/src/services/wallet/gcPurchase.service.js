'use strict';

/**
 * GC package purchase credit (GC stores only).
 *
 * A confirmed payment for a package credits:
 *   - the package's Gold Coins (deposit_packages.gc_coin)            -> wallets GC
 *   - the package's free promotional SC (deposit_packages.final_sc)  -> wallets BSC (bonus, play-through rules apply)
 * SC is never bought: nothing is credited to PSC. Everything runs inside the caller's DB transaction and is
 * idempotent on the payment reference, so repeated callbacks can never credit twice.
 *
 * Existing structures only: deposit_packages, wallets, wallet_ledger, wallet_sc_ledger, user_transactions.
 */

const db = require('../../db/models');
const { creditBonusSc, roundMoney } = require('./walletBuckets.service');
const { BONUS_CURRENCY_CODE } = require('./getCurrencySetting.service');
const gcWallet = require('./gcWallet.service');

const PAID_CURRENCY = 'USD';

function formatGcLabel(n) {
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/**
 * Load the package and make sure it belongs to this user's store and sells Gold Coins.
 */
async function loadGcPackage(userId, packageId, transaction) {
  const id = parseInt(packageId, 10);
  if (!Number.isInteger(id) || id < 1) {
    const err = new Error('A Gold Coin package is required for this purchase.');
    err.statusCode = 400;
    throw err;
  }
  const user = await db.User.findByPk(userId, { attributes: ['userId', 'storeCode'], raw: true, transaction });
  const pkg = await db.DepositPackage.findByPk(id, { transaction });
  if (!user || !pkg || String(pkg.storeCode || '').toLowerCase() !== String(user.storeCode || '').toLowerCase()) {
    const err = new Error('Package not found.');
    err.statusCode = 404;
    throw err;
  }
  const gcCoin = roundMoney(pkg.gcCoin);
  if (!(gcCoin > 0)) {
    const err = new Error('This package has no Gold Coins configured.');
    err.statusCode = 400;
    throw err;
  }
  return { pkg, gcCoin, freeSc: Math.max(0, roundMoney(pkg.finalSc)) };
}

/**
 * @param {object} p
 * @param {number} p.userId
 * @param {number|string} p.packageId
 * @param {string} p.paymentKey       stable payment reference (provider tx id, chime request id, ...)
 * @param {number} [p.payAmount]      USD actually paid
 * @param {number} [p.depositRequestId]
 * @param {object} p.transaction      caller's open transaction
 * @returns {Promise<{ handled: boolean, credited?: boolean, alreadyCredited?: boolean, gcCredited?: number, scBonusCredited?: number }>}
 *   handled=false means "not a GC store": the caller must run its normal SC flow.
 */
async function creditGcPackagePurchase({ userId, packageId, paymentKey, payAmount = null, depositRequestId = null, transaction }) {
  if (!transaction) throw new Error('creditGcPackagePurchase requires a transaction');
  if (!(await gcWallet.isGcStoreUser(userId, transaction))) return { handled: false };

  if (!paymentKey) {
    const err = new Error('Payment reference is required.');
    err.statusCode = 400;
    throw err;
  }

  const { pkg, gcCoin, freeSc } = await loadGcPackage(userId, packageId, transaction);
  const baseMeta = {
    source: 'gc_package_purchase',
    packageId: pkg.id,
    packageTitle: pkg.title || null,
    paymentKey: String(paymentKey),
    ...(depositRequestId ? { depositRequestId } : {}),
    ...(payAmount != null ? { payAmount: Number(payAmount) } : {}),
    gcCoin,
    freeSc
  };

  const gc = await gcWallet.creditGc(userId, gcCoin, {
    transaction,
    type: 'gc_purchase',
    reason: 'GC_PACKAGE_PURCHASE',
    referenceType: 'DEPOSIT_PACKAGE',
    referenceId: String(pkg.id),
    idempotencyKey: `gc_purchase:${paymentKey}`,
    description: `Purchased ${formatGcLabel(gcCoin)} GC${freeSc > 0 ? ` (+${freeSc} free SC)` : ''}`,
    metadata: baseMeta
  });
  if (gc.alreadyCredited) {
    return { handled: true, credited: false, alreadyCredited: true, gcCredited: 0, scBonusCredited: 0 };
  }

  let scBonusCredited = 0;
  if (freeSc > 0) {
    await creditBonusSc(userId, freeSc, {
      transaction,
      ledger: {
        eventType: 'PACKAGE_BONUS',
        bonusType: 'PACKAGE_BONUS',
        sourceType: 'DEPOSIT',
        sourceId: depositRequestId || pkg.id,
        paymentId: depositRequestId || null,
        packageId: pkg.id,
        remarks: `Free SC with ${pkg.title || 'GC package'}`
      }
    });
    await db.UserTransaction.create(
      {
        userId,
        type: 'package_bonus',
        amount: freeSc,
        currencyCode: BONUS_CURRENCY_CODE,
        description: `Free SC bonus with ${formatGcLabel(gcCoin)} GC package`,
        metadata: { ...baseMeta, wallet: BONUS_CURRENCY_CODE }
      },
      { transaction }
    );
    scBonusCredited = freeSc;
  }

  return { handled: true, credited: true, alreadyCredited: false, gcCredited: gcCoin, scBonusCredited };
}

/**
 * GC stores cannot buy SC directly: every purchase must be a Gold Coin package.
 * Call at the start of any checkout (before a payment link/session is created).
 */
async function assertPackageRequiredForGcStore(userId, packageId) {
  if (packageId != null && packageId !== '') return;
  if (!(await gcWallet.isGcStoreUser(userId))) return;
  const err = new Error('Please choose a Gold Coin package. Sweeps Coins cannot be purchased directly.');
  err.statusCode = 400;
  throw err;
}

module.exports = { creditGcPackagePurchase, loadGcPackage, assertPackageRequiredForGcStore, PAID_CURRENCY };

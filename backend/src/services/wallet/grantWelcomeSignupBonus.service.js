'use strict';

const db = require('../../db/models');
const { createLogger } = require('../../libs/logger');
const { BONUS_CURRENCY_CODE } = require('./getCurrencySetting.service');
const { creditBonusSc } = require('./walletBuckets.service');
const gcWallet = require('./gcWallet.service');
const { isAdminPanelAccount, ROLES, normalizeRoleKey } = require('../../constants/roles');
const { resolveStoreFromCode, normalizeStoreCode } = require('../auth/storeBinding.helpers');
const { WELCOME_SIGNUP_TX_TYPE } = require('./bonusPlaythrough.constants');
const { getEffectiveSettings } = require('../welcomeSignupBonus/welcomeSignupBonusSettings.service');

const log = createLogger('welcomeSignupBonus');

function isCustomerUserForWelcomeBonus(role, isAdmin) {
  if (isAdminPanelAccount(role, isAdmin)) return false;
  const normalized = normalizeRoleKey(role);
  return !normalized || normalized === ROLES.USER;
}

function isUniqueViolation(err) {
  const parent = err?.parent || err?.original;
  return err?.name === 'SequelizeUniqueConstraintError' || parent?.code === '23505';
}

/**
 * Referred users never get the welcome signup bonus.
 * They get Refer & Earn friend signup SC instead (never both).
 */
async function shouldSkipWelcomeForReferral(user, _clientStoreCode) {
  return !!(user && user.userReferredBy);
}

/**
 * Credit the one-time welcome signup bonus for eligible new customer signups only.
 * Call only from register / OAuth new-user creation — never from login of an existing user.
 *
 * Referred users (userReferredBy set) are skipped here and
 * receive the referral friend signup bonus instead (never both).
 *
 * Idempotency: application check + partial unique index on (user_id) WHERE type = welcome_signup.
 * Ledger row is written before wallet credit so a duplicate cannot leave a dangling balance bump.
 */
async function grantWelcomeSignupBonus(userId, options = {}, transaction = null) {
  const clientStoreCode = normalizeStoreCode(
    options.clientStoreCode ?? options.client_store_code ?? ''
  );

  const user = await db.User.findByPk(userId, {
    attributes: ['userId', 'storeCode', 'distributorCode', 'role', 'isAdmin', 'userReferredBy']
  });
  if (!user) return null;
  if (!isCustomerUserForWelcomeBonus(user.role, user.isAdmin)) return null;
  if (await shouldSkipWelcomeForReferral(user, clientStoreCode)) {
    log.info('Welcome signup bonus skipped: user signed up with a friend referral link', {
      userId,
      referredBy: user.userReferredBy,
      storeCode: user.storeCode || clientStoreCode || null
    });
    return null;
  }

  const userStoreCode = normalizeStoreCode(user.storeCode || '');
  if (userStoreCode && clientStoreCode && userStoreCode !== clientStoreCode) {
    log.warn('Welcome signup bonus skipped: client store mismatch', {
      userId,
      userStoreCode,
      clientStoreCode
    });
    return null;
  }

  // Prefer the bound user store. Fallback to client store only when the user row has no store yet
  // (same signup transaction that is about to bind them).
  let grantStoreCode = userStoreCode || clientStoreCode;
  if (!grantStoreCode) return null;

  const storeScope = await resolveStoreFromCode(grantStoreCode);
  if (!storeScope) return null;

  const settings = await getEffectiveSettings(storeScope.distributorCode, storeScope.storeCode);
  // GC stores may also give Gold Coins with the welcome bonus (settings.amountGc).
  const creditGcAmount = gcWallet.isGcStoreCode(storeScope.storeCode) ? Math.max(0, Number(settings.amountGc) || 0) : 0;
  if (!settings.enabled || (!(Number(settings.amountSc) > 0) && !(creditGcAmount > 0))) return null;

  const credit = Math.max(0, Number(settings.amountSc) || 0);
  const resolvedStoreCode = normalizeStoreCode(storeScope.storeCode);

  const run = async (t) => {
    const freshUser = await db.User.findByPk(userId, {
      attributes: ['userId', 'storeCode', 'distributorCode', 'role', 'isAdmin', 'userReferredBy'],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!freshUser || !isCustomerUserForWelcomeBonus(freshUser.role, freshUser.isAdmin)) {
      return null;
    }
    if (await shouldSkipWelcomeForReferral(freshUser, clientStoreCode)) {
      return null;
    }

    const existing = await db.UserTransaction.findOne({
      where: { userId, type: WELCOME_SIGNUP_TX_TYPE },
      attributes: ['id'],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (existing) return null;

    if (!freshUser.storeCode) {
      await freshUser.update(
        {
          storeCode: storeScope.storeCode,
          distributorCode: storeScope.distributorCode ?? freshUser.distributorCode
        },
        { transaction: t }
      );
    }

    const currencyCode = BONUS_CURRENCY_CODE;

    // Insert ledger first so unique-index races never credit the wallet twice.
    try {
      await db.UserTransaction.create(
        {
          userId,
          type: WELCOME_SIGNUP_TX_TYPE,
          amount: credit,
          currencyCode,
          description: `Welcome signup bonus: ${credit} BSC`,
          metadata: {
            source: 'welcome_signup',
            bonusSc: credit,
            storeCode: resolvedStoreCode,
            distributorCode: storeScope.distributorCode || null
          }
        },
        { transaction: t }
      );
    } catch (txErr) {
      if (isUniqueViolation(txErr)) {
        log.warn('Welcome signup bonus duplicate blocked by unique index', { userId });
        return null;
      }
      throw txErr;
    }

    if (credit > 0) {
      await creditBonusSc(userId, credit, {
        transaction: t,
        ledger: {
          eventType: 'WELCOME_BONUS',
          bonusType: 'WELCOME_BONUS',
          sourceType: 'WELCOME_SIGNUP',
          sourceId: userId,
          remarks: 'Welcome signup bonus'
        }
      });
    }

    // Gold Coins: once per user (the welcome_signup guard row above already blocks repeats).
    if (creditGcAmount > 0) {
      await gcWallet.creditGc(userId, creditGcAmount, {
        transaction: t,
        // Not 'welcome_signup': that type is unique per user and already holds the SC guard row.
        type: 'welcome_signup_gc',
        reason: 'WELCOME_BONUS_GC',
        referenceType: 'WELCOME_SIGNUP',
        referenceId: String(userId),
        idempotencyKey: `welcome_gc:${userId}`,
        description: `Welcome signup bonus: ${creditGcAmount.toLocaleString('en-US')} GC`,
        metadata: { source: 'welcome_signup', bonusGc: creditGcAmount, storeCode: resolvedStoreCode }
      });
    }

    log.info('Welcome signup bonus granted', {
      userId,
      amountSc: credit,
      amountGc: creditGcAmount,
      storeCode: resolvedStoreCode
    });
    return { granted: true, amount_sc: credit, amount_gc: creditGcAmount };
  };

  if (transaction) return run(transaction);
  return db.sequelize.transaction(run);
}

async function tryGrantWelcomeSignupBonus(userId, options = {}) {
  try {
    return await grantWelcomeSignupBonus(userId, options);
  } catch (err) {
    log.warn('Welcome signup bonus grant failed', { userId, message: err.message });
    return null;
  }
}

module.exports = {
  grantWelcomeSignupBonus,
  tryGrantWelcomeSignupBonus,
  WELCOME_SIGNUP_TX_TYPE
};

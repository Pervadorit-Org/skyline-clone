'use strict';

const { paymentErrorLog } = require('../../libs/logger');

const RESOLVE_URL = 'https://ledger-api.centryos.xyz/v1/checkout/poket/resolve';
const CHECK_TIMEOUT_MS = 4000;
const UNAVAILABLE_MESSAGE = 'Payments are temporarily unavailable. Please try again later.';

/** Checkout token: the payment-link token, or the last path segment of the CentryOS checkout URL. */
function resolveCheckoutToken(paymentLink, token) {
  const direct = token != null ? String(token).trim() : '';
  if (direct) return direct;
  try {
    const url = new URL(String(paymentLink || ''));
    if (!url.hostname.endsWith('centryos.xyz')) return '';
    const parts = url.pathname.split('/').filter(Boolean);
    return parts.length >= 2 ? parts[parts.length - 1] : '';
  } catch (_) {
    return '';
  }
}

/**
 * The CentryOS checkout page shows "Temporarily unavailable" when its resolve call answers
 * `walletUnavailable: true` (merchant wallet disabled). Ask the same question before the player
 * is sent there. Any other outcome (timeout, error, unknown shape) lets the payment continue.
 */
async function isCentryosWalletUnavailable(paymentLink, token) {
  const checkoutToken = resolveCheckoutToken(paymentLink, token);
  if (!checkoutToken) return false;
  try {
    const res = await fetch(RESOLVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token: checkoutToken }),
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS)
    });
    const body = await res.json().catch(() => null);
    return body?.walletUnavailable === true;
  } catch (err) {
    paymentErrorLog('CentryOS wallet pre-check skipped', err.message);
    return false;
  }
}

/** Throws a 503 the deposit endpoint shows to the player as-is. */
async function assertCentryosWalletAvailable(paymentLink, token) {
  if (!(await isCentryosWalletUnavailable(paymentLink, token))) return;
  paymentErrorLog('CentryOS checkout reports walletUnavailable (merchant wallet disabled)', paymentLink);
  const err = new Error(UNAVAILABLE_MESSAGE);
  err.statusCode = 503;
  err.code = 'PAYMENT_WALLET_UNAVAILABLE';
  throw err;
}

module.exports = { assertCentryosWalletAvailable, isCentryosWalletUnavailable, UNAVAILABLE_MESSAGE };

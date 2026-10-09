'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../../configs/app.config');

const isProduction = config.get('env') === 'production';

/**
 * Rate limiter for auth endpoints (login, register, SSO).
 * Prevents brute force, token stuffing, and credential abuse.
 * Stricter in production.
 */
const authRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isProduction ? 60 : 1000, // max requests per window per IP (at least 50+/min)
  message: { message: 'Too many sign-in attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Brute-force guard for credential endpoints: counts only failed attempts (HTTP >= 400)
 * per IP, so normal logins are unaffected but password guessing is throttled.
 */
const loginAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 1000,
  skipSuccessfulRequests: true,
  message: { message: 'Too many failed attempts. Please wait a few minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false
});

/** Password reset / email flows: low volume, high abuse value (email bombing, enumeration). */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProduction ? 10 : 1000,
  message: { message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { authRateLimiter, loginAttemptLimiter, passwordResetLimiter };

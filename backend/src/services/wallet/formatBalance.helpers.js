'use strict';

function formatAmount(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0.00';
  return num.toFixed(2);
}

function formatBalance(value) {
  return Number(formatAmount(value));
}

module.exports = { formatAmount, formatBalance };

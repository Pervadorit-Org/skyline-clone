const db = require('../../db/models');

/**
 * Marketing consent without any users columns:
 *  - Email: opted in unless the address is in `email_unsubscribes` (the table email campaigns already honour).
 *  - SMS: one `settings` row per user (key sms_marketing_opt_in_user_<id>), default off.
 */
const SMS_KEY_PREFIX = 'sms_marketing_opt_in_user_';

function smsKey(userId) {
  return `${SMS_KEY_PREFIX}${userId}`;
}

function unsubscribeWhere(user) {
  return { storeCode: user.storeCode, email: String(user.email || '').toLowerCase() };
}

async function getMarketingPrefs(user) {
  let email = true;
  if (db.EmailUnsubscribe && user.email && user.storeCode) {
    email = !(await db.EmailUnsubscribe.findOne({ where: unsubscribeWhere(user), attributes: ['id'] }));
  }
  const smsRow = await db.Setting.findOne({
    where: { key: smsKey(user.userId), distributorCode: null, storeCode: null },
    attributes: ['value']
  });
  return { marketingEmailOptIn: email, marketingSmsOptIn: smsRow?.value === 'true' };
}

async function updateMarketingPrefs(userId, body) {
  const user = await db.User.findByPk(userId, { attributes: ['userId', 'email', 'storeCode'] });
  if (!user) {
    const err = new Error('Your session may have expired. Please sign in again.');
    err.statusCode = 404;
    throw err;
  }
  if (typeof body?.email !== 'boolean' && typeof body?.sms !== 'boolean') {
    const err = new Error('Nothing to update.');
    err.statusCode = 400;
    throw err;
  }

  if (typeof body.email === 'boolean' && db.EmailUnsubscribe && user.email && user.storeCode) {
    const where = unsubscribeWhere(user);
    if (body.email) await db.EmailUnsubscribe.destroy({ where });
    else await db.EmailUnsubscribe.findOrCreate({ where, defaults: where });
  }

  if (typeof body.sms === 'boolean') {
    const where = { key: smsKey(user.userId), distributorCode: null, storeCode: null };
    const value = body.sms ? 'true' : 'false';
    const [row] = await db.Setting.findOrCreate({ where, defaults: { ...where, value } });
    if (row.value !== value) await row.update({ value });
  }

  return getMarketingPrefs(user);
}

module.exports = { updateMarketingPrefs, getMarketingPrefs };

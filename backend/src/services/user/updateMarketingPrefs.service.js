const db = require('../../db/models');

/** Toggle marketing opt-ins. Email also mirrors to email_unsubscribes so campaigns honour it. */
async function updateMarketingPrefs(userId, body) {
  const user = await db.User.findByPk(userId);
  if (!user) {
    const err = new Error('Your session may have expired. Please sign in again.');
    err.statusCode = 404;
    throw err;
  }
  const updates = {};
  if (typeof body?.email === 'boolean') updates.marketingEmailOptIn = body.email;
  if (typeof body?.sms === 'boolean') updates.marketingSmsOptIn = body.sms;
  if (Object.keys(updates).length === 0) {
    const err = new Error('Nothing to update.');
    err.statusCode = 400;
    throw err;
  }
  await user.update(updates);

  if (typeof body.email === 'boolean' && db.EmailUnsubscribe && user.email && user.storeCode) {
    const where = { storeCode: user.storeCode, email: String(user.email).toLowerCase() };
    if (body.email) await db.EmailUnsubscribe.destroy({ where });
    else await db.EmailUnsubscribe.findOrCreate({ where, defaults: where });
  }

  return {
    marketingEmailOptIn: user.marketingEmailOptIn,
    marketingSmsOptIn: user.marketingSmsOptIn
  };
}

module.exports = { updateMarketingPrefs };

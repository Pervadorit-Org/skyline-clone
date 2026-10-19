/**
 * Local dev only: create (or reset the password of) a regular player account.
 *
 *   node scripts/seed-local-user.js
 *
 * Writes the login to ../frontend/LOCAL_LOGIN.md (gitignored).
 * Override with USER_EMAIL / USER_PASSWORD env vars.
 */
require('dotenv').config({ override: true });
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../src/db/models');
const { encryptPassword, validatePasswordStrength } = require('../src/utils/common');

if ((process.env.NODE_ENV || 'development') === 'production') {
  console.error('Refusing to run in production.');
  process.exit(1);
}

const email = (process.env.USER_EMAIL || 'player@dragonfury.local').toLowerCase();
const password =
  process.env.USER_PASSWORD || `Df-${crypto.randomBytes(6).toString('hex')}-${crypto.randomInt(10, 99)}A!`;

async function main() {
  const check = validatePasswordStrength(password);
  if (!check.valid) throw new Error(check.error);

  await db.sequelize.authenticate();
  const hashed = encryptPassword(password);
  const existing = await db.User.findOne({ where: { email } });
  if (existing) {
    await existing.update({ password: hashed, isActive: true, isEmailVerified: true });
  } else {
    await db.User.create({
      username: 'dragonfury_player',
      firstName: 'Test',
      lastName: 'Player',
      email,
      password: hashed,
      isEmailVerified: true,
      isActive: true,
      isAdmin: false,
      role: 'user',
      signInType: 'NORMAL'
    });
  }

  const note = path.join(__dirname, '..', '..', 'frontend', 'LOCAL_LOGIN.md');
  fs.writeFileSync(note, `# Local player login\nemail: ${email}\npassword: ${password}\n`);
  console.log(`Player ${existing ? 'password reset' : 'created'}. Login saved to ${note}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.sequelize.close());

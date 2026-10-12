/**
 * Local dev only: create (or reset the password of) a master admin so you can
 * sign in to the admin panel at http://localhost:5174.
 *
 *   node scripts/seed-local-admin.js
 *
 * Writes the generated login to ../admin/LOCAL_LOGIN.md (gitignored).
 * Override with ADMIN_EMAIL / ADMIN_PASSWORD env vars.
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

const email = (process.env.ADMIN_EMAIL || 'admin@dragonfury.local').toLowerCase();
const password =
  process.env.ADMIN_PASSWORD || `Df-${crypto.randomBytes(6).toString('hex')}-${crypto.randomInt(10, 99)}A!`;

async function main() {
  const check = validatePasswordStrength(password);
  if (!check.valid) throw new Error(check.error);

  await db.sequelize.authenticate();
  const hashed = encryptPassword(password);
  const existing = await db.User.findOne({ where: { email, role: 'master_admin' } });
  if (existing) {
    await existing.update({ password: hashed, isActive: true, isAdmin: true });
  } else {
    await db.User.create({
      username: 'dragonfury_master',
      firstName: 'Dragon',
      lastName: 'Admin',
      email,
      password: hashed,
      isEmailVerified: true,
      isActive: true,
      isAdmin: true,
      role: 'master_admin',
      signInType: 'NORMAL'
    });
  }

  const note = path.join(__dirname, '..', '..', 'admin', 'LOCAL_LOGIN.md');
  fs.writeFileSync(
    note,
    `# Local admin login (localhost:5174 only)\nemail: ${email}\npassword: ${password}\n\nAdmin login sends an OTP: it is printed in the backend terminal (ADMIN_OTP_LOG_ONLY=true).\n`
  );
  console.log(`Master admin ${existing ? 'password reset' : 'created'}. Login saved to ${note}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.sequelize.close());

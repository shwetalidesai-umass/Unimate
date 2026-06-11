const dotenv = require('dotenv');

dotenv.config();

function normalizeDomain(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^['"]|['"]$/g, '')
    .replace(/^\uFEFF/, '')
    .replace(/\.+$/, '');
}

module.exports = {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  allowedEmailDomains: (process.env.ALLOWED_EMAIL_DOMAINS || 'umass.edu,amherst.edu,hampshire.edu,mtholyoke.edu,smith.edu')
    .split(',')
    .map(normalizeDomain)
    .filter(Boolean),
};
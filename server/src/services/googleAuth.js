const { OAuth2Client } = require('google-auth-library');
const { googleClientId } = require('../config/env');

/**
 * Verifies a Google ID token ("credential" from Google Identity Services)
 * and returns its payload.
 */
async function verifyGoogleIdToken(idToken) {
  if (!googleClientId) {
    throw new Error('GOOGLE_CLIENT_ID is not set');
  }
  const client = new OAuth2Client(googleClientId);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: googleClientId,
  });
  return ticket.getPayload();
}

module.exports = { verifyGoogleIdToken };


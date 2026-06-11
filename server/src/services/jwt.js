const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

function signAccessToken(payload, { expiresIn = '7d' } = {}) {
  if (!jwtSecret) throw new Error('JWT_SECRET is not set');
  return jwt.sign(payload, jwtSecret, { expiresIn });
}

function verifyAccessToken(token) {
  if (!jwtSecret) throw new Error('JWT_SECRET is not set');
  return jwt.verify(token, jwtSecret);
}

module.exports = { signAccessToken, verifyAccessToken };


// src/middleware/auth.js
// Verifies the JWT sent in the Authorization header.
// Sets req.user = { id, email, onboarding_done } on success.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required');

/**
 * requireAuth — attach to any protected route.
 * Responds 401 if the token is missing or invalid.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing access token' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;   // { id, email, onboarding_done, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * issueTokens — call after a successful Google auth.
 * Returns { accessToken, refreshToken }.
 */
export function issueTokens(payload) {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ sub: payload.id }, JWT_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

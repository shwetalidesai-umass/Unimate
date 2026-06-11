// src/routes/auth.js
// Handles:
//   GET  /api/auth/google          → redirect to Google OAuth consent
//   GET  /api/auth/google/callback → exchange code, upsert user, issue JWT
//   POST /api/auth/onboarding      → save step-1 & step-2 profile data
//   POST /api/auth/token/refresh   → rotate refresh token
//   POST /api/auth/logout          → revoke refresh token

import { Router }   from 'express';
import { OAuth2Client } from 'google-auth-library';
import crypto           from 'crypto';
import pool             from '../db/pool.js';
import { issueTokens, requireAuth } from '../middleware/auth.js';

const router  = Router();
const gClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI        // e.g. http://localhost:4000/api/auth/google/callback
);

// ── Five College allowed email domains ────────────────────────
const ALLOWED_DOMAINS = [
  'umass.edu',
  'amherst.edu',
  'smith.edu',
  'mtholyoke.edu',
  'hampshire.edu',
];

function isFiveCollegeEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

function schoolFromEmail(email) {
  const map = {
    'umass.edu':       'umass',
    'amherst.edu':     'amherst',
    'smith.edu':       'smith',
    'mtholyoke.edu':   'mount_holyoke',
    'hampshire.edu':   'hampshire',
  };
  return map[email.split('@')[1]?.toLowerCase()] || null;
}

// ── Refresh-token helpers ──────────────────────────────────────
function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function storeRefreshToken(userId, rawToken) {
  const hash      = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hash, expiresAt]
  );
}

// ── GET /api/auth/google ──────────────────────────────────────
// Redirect the browser to Google's OAuth consent page.
router.get('/google', (req, res) => {
  const url = gClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
  });
  res.redirect(url);
});

// ── GET /api/auth/google/callback ─────────────────────────────
// Google redirects here after the user consents.
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect(`${process.env.CLIENT_URL}/login?error=missing_code`);
  }

  try {
    // 1. Exchange auth code for tokens
    const { tokens }  = await gClient.getToken(code);
    gClient.setCredentials(tokens);

    // 2. Decode the ID token to get user info
    const ticket   = await gClient.verifyIdToken({
      idToken:  tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload  = ticket.getPayload();
    const email    = payload.email?.toLowerCase();
    const fullName = payload.name;
    const avatar   = payload.picture || null;

    // 3. Enforce Five College domain
    if (!isFiveCollegeEmail(email)) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=unauthorized_domain`);
    }

    // 4. Upsert the user row
    const { rows } = await pool.query(
      `INSERT INTO users (email, full_name, avatar_url, school)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET full_name  = EXCLUDED.full_name,
             avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
             updated_at = NOW()
       RETURNING id, email, full_name, onboarding_done`,
      [email, fullName, avatar, schoolFromEmail(email)]
    );
    const user = rows[0];

    // 5. Issue JWT + refresh token
    const { accessToken, refreshToken } = issueTokens({
      id:              user.id,
      email:           user.email,
      onboarding_done: user.onboarding_done,
    });
    await storeRefreshToken(user.id, refreshToken);

    // 6. Hand tokens back to the client.
    //    We redirect with the access token in the URL so the React
    //    AuthCallback component can pull it out (same as the existing flow).
    //    The refresh token goes in an HttpOnly cookie.
    res.cookie('unimate_rt', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   30 * 24 * 60 * 60 * 1000,
    });
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${accessToken}`);

  } catch (err) {
    console.error('[auth/callback]', err);
    res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
  }
});

// ── POST /api/auth/onboarding ─────────────────────────────────
// Called after step 1 and step 2 of the onboarding flow.
// The frontend sends whichever fields the current step collects.
//
// Step 1 body: { step: 1, school, class_year, major }
// Step 2 body: { step: 2, courses: ["COMPSCI 520", ...], availability }
router.post('/onboarding', requireAuth, async (req, res) => {
  const { step } = req.body;
  const userId   = req.user.id;

  if (step === 1) {
    const { school, class_year, major } = req.body;

    // Validate school value
    const validSchools = ['umass','amherst','smith','mount_holyoke','hampshire'];
    if (!validSchools.includes(school)) {
      return res.status(400).json({ error: 'Invalid school value' });
    }
    const year = Number(class_year);
    if (!year || year < 2020 || year > 2040) {
      return res.status(400).json({ error: 'Invalid class year' });
    }

    await pool.query(
      `UPDATE users SET school = $1, class_year = $2, major = $3 WHERE id = $4`,
      [school, year, major?.trim() || null, userId]
    );
    return res.json({ ok: true, step: 1 });
  }

  if (step === 2) {
    const { courses = [], availability } = req.body;

    // courses is an array of course code strings: ["COMPSCI 520", "MATH 235"]
    if (!Array.isArray(courses)) {
      return res.status(400).json({ error: 'courses must be an array' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update availability and mark onboarding complete
      await client.query(
        `UPDATE users SET availability = $1, onboarding_done = TRUE WHERE id = $2`,
        [availability?.trim() || null, userId]
      );

      // Upsert courses and link them to the user
      for (const rawCode of courses) {
        const code = rawCode.trim().toUpperCase();
        if (!code) continue;

        // Upsert the course row (school can be inferred later; use NULL for now)
        const { rows } = await client.query(
          `INSERT INTO courses (code)
           VALUES ($1)
           ON CONFLICT (code, school)
             DO UPDATE SET code = EXCLUDED.code   -- no-op, just to get id back
           RETURNING id`,
          [code]
        );
        // Handle the edge-case where school IS NULL (unique index is on (code, school))
        // If the row doesn't exist yet we get it back; otherwise we fetch it.
        let courseId = rows[0]?.id;
        if (!courseId) {
          const { rows: existing } = await client.query(
            `SELECT id FROM courses WHERE code = $1 AND school IS NULL`, [code]
          );
          courseId = existing[0]?.id;
        }
        if (courseId) {
          await client.query(
            `INSERT INTO user_courses (user_id, course_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [userId, courseId]
          );
        }
      }

      await client.query('COMMIT');
      return res.json({ ok: true, step: 2 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return res.status(400).json({ error: 'Invalid step' });
});

// ── POST /api/auth/token/refresh ──────────────────────────────
// Rotate the refresh token: validate the cookie, issue fresh tokens.
router.post('/token/refresh', async (req, res) => {
  const raw = req.cookies?.unimate_rt;
  if (!raw) return res.status(401).json({ error: 'No refresh token' });

  const hash = hashToken(raw);
  const { rows } = await pool.query(
    `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked,
            u.email, u.onboarding_done
     FROM   refresh_tokens rt
     JOIN   users u ON u.id = rt.user_id
     WHERE  rt.token_hash = $1`,
    [hash]
  );

  const rt = rows[0];
  if (!rt || rt.revoked || new Date(rt.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Refresh token invalid or expired' });
  }

  // Revoke old token (rotation)
  await pool.query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`, [rt.id]);

  const { accessToken, refreshToken: newRaw } = issueTokens({
    id:              rt.user_id,
    email:           rt.email,
    onboarding_done: rt.onboarding_done,
  });
  await storeRefreshToken(rt.user_id, newRaw);

  res.cookie('unimate_rt', newRaw, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   30 * 24 * 60 * 60 * 1000,
  });
  res.json({ accessToken });
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', async (req, res) => {
  const raw = req.cookies?.unimate_rt;
  if (raw) {
    const hash = hashToken(raw);
    await pool.query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`, [hash]
    );
  }
  res.clearCookie('unimate_rt');
  res.json({ ok: true });
});

export default router;

import { Router }   from 'express';
import { OAuth2Client } from 'google-auth-library';
import crypto           from 'crypto';
import pool             from '../db/pool.js';
import { issueTokens, requireAuth } from '../middleware/auth.js';
import { googleOAuthEnvIssues } from '../lib/googleOAuthEnv.js';

const router = Router();

/** Must match an "Authorized redirect URI" in Google Cloud Console (Web client), character-for-character. */
function googleRedirectUri() {
  let uri = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (!uri) {
    const port = process.env.PORT || 4000;
    uri = `http://localhost:${port}/api/auth/google/callback`;
  }
  // Google treats trailing slash as a different URI than without it
  return uri.replace(/\/$/, '');
}

let gClient;
function getGoogleClient() {
  if (!gClient) {
    gClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      googleRedirectUri(),
    );
  }
  return gClient;
}

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

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function storeRefreshToken(userId, rawToken) {
  const hash      = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hash, expiresAt]
  );
}

/**
 * Test helper login (E2E only)
 * - Enabled only when NODE_ENV === 'test'
 * - Upserts a user row so FK constraints succeed (collab/discussions/reviews).
 * - Issues and stores a refresh token so `/api/auth/token/refresh` works in onboarding.
 */
router.post('/test/login', async (req, res) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(404).json({ error: 'Not found' });
  }

  const {
    email = 'student@umass.edu',
    full_name = 'E2E Student',
    onboarding_done = true,
    school = 'umass',
  } = req.body || {};

  const normalizedEmail = String(email).toLowerCase().trim();
  if (!normalizedEmail.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const { rows } = await pool.query(
    `INSERT INTO users (email, full_name, school, onboarding_done)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           school = COALESCE(EXCLUDED.school, users.school),
           onboarding_done = EXCLUDED.onboarding_done,
           updated_at = NOW()
     RETURNING id, email, full_name, onboarding_done`,
    [normalizedEmail, String(full_name || '').trim() || null, school || null, Boolean(onboarding_done)],
  );
  const user = rows[0];

  const { accessToken } = issueTokens({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    onboarding_done: user.onboarding_done,
  });
  // Retry in the extremely rare event of a hash collision.
  let refreshToken = null;
  for (let i = 0; i < 3; i += 1) {
    refreshToken = issueTokens({ id: user.id }).refreshToken;
    try {
      // eslint-disable-next-line no-await-in-loop
      await storeRefreshToken(user.id, refreshToken);
      break;
    } catch (e) {
      if (e?.code !== '23505') throw e;
      refreshToken = null;
    }
  }
  if (!refreshToken) return res.status(500).json({ error: 'Failed to store refresh token' });

  res.cookie('unimate_rt', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return res.json({ accessToken, refreshToken, user });
});

/** Dev helper: open http://localhost:4000/api/auth/oauth-redirect-help and paste `redirect_uri` into Google Console. */
router.get('/oauth-redirect-help', (_req, res) => {
  const redirect_uri = googleRedirectUri();
  const id = process.env.GOOGLE_CLIENT_ID?.trim() || '';
  const mask =
    id.length > 16
      ? `${id.slice(0, 8)}…${id.slice(-10)}`
      : id
        ? '(too short to mask)'
        : '(not set)';
  res.json({
    redirect_uri,
    client_id_masked: mask,
    env_issues: googleOAuthEnvIssues(),
    google_console_path: 'APIs & Services → Credentials → your OAuth 2.0 Web client → Authorized redirect URIs',
    note: 'Must match exactly (http vs https, localhost vs 127.0.0.1, port, path, no trailing slash).',
  });
});

router.get('/google', (req, res) => {
  const redirectUri = googleRedirectUri();
  if (process.env.NODE_ENV !== 'production') {
    console.log('[oauth] redirect_uri → Google:', redirectUri);
  }
  const oauthIssues = googleOAuthEnvIssues();
  if (oauthIssues.length) {
    const base = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    console.warn('[oauth] blocked /google —', oauthIssues.join(' | '));
    return res.redirect(`${base}/login?error=google_oauth_not_configured`);
  }
  if (!process.env.GOOGLE_CLIENT_ID?.trim()) {
    return res.status(500).json({ error: 'Missing GOOGLE_CLIENT_ID' });
  }
  if (!process.env.GOOGLE_CLIENT_SECRET?.trim()) {
    return res.status(500).json({ error: 'Missing GOOGLE_CLIENT_SECRET' });
  }
  const url = getGoogleClient().generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    redirect_uri: redirectUri,
  });
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect(`${process.env.CLIENT_URL}/login?error=missing_code`);
  }

  const client = getGoogleClient();

  try {
    const { tokens }  = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket   = await client.verifyIdToken({
      idToken:  tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload  = ticket.getPayload();
    const email    = payload.email?.toLowerCase();
    const fullName = payload.name;
    const avatar   = payload.picture || null;

    console.log('Email received:', email);
    console.log('Domain check:', isFiveCollegeEmail(email));
    if (!isFiveCollegeEmail(email)) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=unauthorized_domain`);
    }

    console.log('Past domain check, inserting user...');

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

    const { accessToken, refreshToken } = issueTokens({
      id:              user.id,
      email:           user.email,
      full_name:       user.full_name,
      onboarding_done: user.onboarding_done,
    });
    await storeRefreshToken(user.id, refreshToken);

    res.cookie('unimate_rt', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   30 * 24 * 60 * 60 * 1000,
    });
    console.log('Redirecting to:', `${process.env.CLIENT_URL}/auth/callback?token=${accessToken}`);
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${accessToken}`);

  } catch (err) {
    console.error('[auth/callback]', err);
    const base = `${process.env.CLIENT_URL}/login?error=server_error`;
    if (process.env.NODE_ENV !== 'production' && err?.message) {
      const reason = encodeURIComponent(String(err.message).slice(0, 300));
      return res.redirect(`${base}&reason=${reason}`);
    }
    res.redirect(base);
  }
});

/** Works with UNIQUE(code) (legacy) or UNIQUE(code, school) (001 schema). */
async function ensureCourseId(tx, code) {
  const found = await tx.query('SELECT id FROM courses WHERE code = $1 LIMIT 1', [code]);
  if (found.rows[0]) return found.rows[0].id;
  try {
    const ins = await tx.query(
      'INSERT INTO courses (code) VALUES ($1) RETURNING id',
      [code],
    );
    return ins.rows[0].id;
  } catch (e) {
    if (e.code !== '23505') throw e;
    const again = await tx.query('SELECT id FROM courses WHERE code = $1 LIMIT 1', [code]);
    if (!again.rows[0]) throw e;
    return again.rows[0].id;
  }
}

router.post('/onboarding', requireAuth, async (req, res) => {
  const userId = req.user?.id ?? req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: 'Invalid token: missing user id' });
  }

  try {
    const { step } = req.body;

    if (step === 1) {
      const { school, class_year, major } = req.body;

      const validSchools = ['umass', 'amherst', 'smith', 'mount_holyoke', 'hampshire'];
      if (!validSchools.includes(school)) {
        return res.status(400).json({ error: 'Invalid school value' });
      }
      const year = Number(class_year);
      if (!year || year < 2020 || year > 2040) {
        return res.status(400).json({ error: 'Invalid class year' });
      }

      await pool.query(
        `UPDATE users SET school = $1, class_year = $2, major = $3 WHERE id = $4::uuid`,
        [school, year, major?.trim() || null, String(userId)],
      );
      return res.json({ ok: true, step: 1 });
    }

    if (step === 2) {
      const { courses = [], availability } = req.body;

      if (!Array.isArray(courses)) {
        return res.status(400).json({ error: 'courses must be an array' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const upd = await client.query(
          `UPDATE users SET availability = $1, onboarding_done = TRUE WHERE id = $2::uuid`,
          [availability?.trim() || null, String(userId)],
        );
        if (upd.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'User not found for this token' });
        }

        for (const rawCode of courses) {
          const code = String(rawCode).trim().toUpperCase();
          if (!code) continue;

          const courseId = await ensureCourseId(client, code);
          await client.query(
            `INSERT INTO user_courses (user_id, course_id)
             VALUES ($1::uuid, $2::uuid)
             ON CONFLICT DO NOTHING`,
            [String(userId), courseId],
          );
        }

        await client.query('COMMIT');
        return res.json({ ok: true, step: 2 });
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch {
          /* ignore */
        }
        throw err;
      } finally {
        client.release();
      }
    }

    return res.status(400).json({ error: 'Invalid step' });
  } catch (err) {
    console.error('[onboarding]', err);
    return res.status(500).json({
      error:   'Onboarding failed',
      detail:  err.message,
      pgCode:  err.code || undefined,
    });
  }
});

router.post('/token/refresh', async (req, res) => {
  const raw = req.cookies?.unimate_rt;
  if (!raw) return res.status(401).json({ error: 'No refresh token' });

  const hash = hashToken(raw);
  const { rows } = await pool.query(
    `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked,
            u.email, u.full_name, u.onboarding_done
     FROM   refresh_tokens rt
     JOIN   users u ON u.id = rt.user_id
     WHERE  rt.token_hash = $1`,
    [hash]
  );

  const rt = rows[0];
  if (!rt || rt.revoked || new Date(rt.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Refresh token invalid or expired' });
  }

  await pool.query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`, [rt.id]);

  const { accessToken, refreshToken: newRaw } = issueTokens({
    id:              rt.user_id,
    email:           rt.email,
    full_name:       rt.full_name,
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

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.avatar_url, u.school, 
            u.class_year, u.major, u.availability, u.onboarding_done,
            COALESCE(
              json_agg(
                json_build_object('id', c.id, 'code', c.code, 'title', c.title)
              ) FILTER (WHERE c.id IS NOT NULL), '[]'
            ) AS courses
     FROM users u
     LEFT JOIN user_courses uc ON uc.user_id = u.id
     LEFT JOIN courses c ON c.id = uc.course_id
     WHERE u.id = $1
     GROUP BY u.id`,
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

export default router;
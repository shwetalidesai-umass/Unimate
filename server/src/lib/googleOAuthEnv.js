/**
 * Google OAuth env helpers. Keeps .env mistakes from reaching Google's invalid_client page.
 */

const GOOGLE_KEYS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'];

/** Trim and strip wrapping quotes (common when pasting from docs). */
export function normalizeGoogleOAuthEnv() {
  for (const key of GOOGLE_KEYS) {
    let v = process.env[key];
    if (typeof v !== 'string') continue;
    v = v.trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1).trim();
    }
    process.env[key] = v;
  }
}

function looksLikePlaceholder(idOrSecret) {
  const s = idOrSecret.toLowerCase();
  return (
    s.includes('your-client-id') ||
    s.includes('your_google_client_id') ||
    s.includes('your-client-secret') ||
    s.includes('your_google_client_secret') ||
    s === 'your-client-secret' ||
    /^change[_-]?me/i.test(s)
  );
}

/**
 * @returns {string[]} Human-readable issues; empty array means format looks OK (Google may still reject).
 */
export function googleOAuthEnvIssues() {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const issues = [];

  if (!id) issues.push('GOOGLE_CLIENT_ID is empty');
  if (!secret) issues.push('GOOGLE_CLIENT_SECRET is empty');
  if (!id || !secret) return issues;

  if (looksLikePlaceholder(id)) {
    issues.push(
      'GOOGLE_CLIENT_ID still looks like a placeholder — paste the Web client ID from Google Cloud Console → Credentials',
    );
  }
  if (looksLikePlaceholder(secret)) {
    issues.push(
      'GOOGLE_CLIENT_SECRET still looks like a placeholder — paste the matching client secret from the same OAuth client',
    );
  }

  if (!id.endsWith('.apps.googleusercontent.com')) {
    issues.push(
      'GOOGLE_CLIENT_ID should end with .apps.googleusercontent.com (OAuth 2.0 Web application client)',
    );
  } else if (!/^[\d]+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/i.test(id)) {
    issues.push(
      'GOOGLE_CLIENT_ID format looks wrong — expected like 123456789-abc.apps.googleusercontent.com',
    );
  }

  return issues;
}

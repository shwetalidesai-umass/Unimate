import React from 'react';

/**
 * OAuth must start with a full browser navigation to the API.
 * In CRA dev, GET /api/* via <a href> is NOT proxied like fetch() (Accept: text/html → index.html),
 * so we send users straight to the API origin.
 */
function getGoogleOAuthHref() {
  const fromEnv = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
  if (fromEnv) return `${fromEnv}/api/auth/google`;
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.REACT_APP_API_PORT || '4000';
    return `http://localhost:${port}/api/auth/google`;
  }
  return '/api/auth/google';
}

export default function GoogleSignInButton() {
  return (
    <a href={getGoogleOAuthHref()} className="google-button">
      <span className="google-icon">G</span>
      Sign in with Google
    </a>
  );
}

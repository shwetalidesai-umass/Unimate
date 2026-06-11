import React, { useEffect, useState } from 'react';
import AuthCard from '../components/auth/AuthCard';

function SignInPage() {
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'unauthorized_domain') {
      setError('That email address is not from a Five College institution. Please sign in with your university email (umass.edu, amherst.edu, smith.edu, mtholyoke.edu, or hampshire.edu).');
      return;
    }
    if (params.get('error') === 'server_error') {
      const reason = params.get('reason');
      setError(
        reason
          ? `Sign-in failed (server). ${decodeURIComponent(reason)}`
          : 'Sign-in failed on the server. Check the API terminal logs, database is running, and schema matches server/001_initial_schema.sql (recreate Docker volume if you changed compose).',
      );
      return;
    }
    if (params.get('error') === 'google_oauth_not_configured') {
      const apiBase = (process.env.REACT_APP_API_URL || 'http://localhost:4000').replace(/\/$/, '');
      setError(
        'Google OAuth credentials look missing or invalid in server/.env (Google shows "invalid_client" if the request still goes through). '
        + 'In Google Cloud Console → APIs & Services → Credentials, create an OAuth 2.0 Client ID of type Web application. '
        + 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env to that client\'s ID and secret (not the .env.example placeholders). '
        + `Add this Authorized redirect URI on that client: open ${apiBase}/api/auth/oauth-redirect-help for the exact redirect_uri (must match PORT in server/.env). `
        + 'Restart the API after saving .env.',
      );
    }
  }, []);

  return (
    <div className="page-shell">
      {error && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#2e1a1a',
          border: '1px solid #8a2d2d',
          color: '#ff6b6b',
          padding: '16px 24px',
          borderRadius: '12px',
          maxWidth: '420px',
          width: '90%',
          zIndex: 1000,
          textAlign: 'center',
          fontSize: '0.9rem',
          lineHeight: '1.5',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
          <p style={{ fontWeight: 600, marginBottom: '6px' }}>Access Denied</p>
          <p>{error}</p>
          <button
            onClick={() => setError('')}
            style={{
              marginTop: '12px',
              background: 'transparent',
              border: '1px solid #8a2d2d',
              color: '#ff6b6b',
              padding: '6px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      <AuthCard />
    </div>
  );
}

export default SignInPage;
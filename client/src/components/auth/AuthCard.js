import React from 'react';
import GoogleSignInButton from './GoogleSignInButton';

function AuthCard() {
  return (
    <article className="auth-card">
      <div className="auth-card__brand">
        <img src="/logo.png" alt="UniMate" style={{ width: '64px', height: '64px', borderRadius: '20px' }} />
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>UniMate</h1>
          <p style={{ margin: 0, fontSize: '1rem' }}>Five College student platform</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', textAlign: 'center', lineHeight: 1.6 }}>
          Connect with students across UMass, Amherst, Hampshire, Mount Holyoke and Smith College.
        </p>
        <GoogleSignInButton />
      </div>

      <p className="auth-card__footer" style={{ textAlign: 'center' }}>
        🔒 Only Five College email addresses are permitted
      </p>
    </article>
  );
}

export default AuthCard;
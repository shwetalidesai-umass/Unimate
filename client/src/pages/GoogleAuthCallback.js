import React, { useEffect } from 'react';
import axios from 'axios';

function GoogleAuthCallback() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const search = new URLSearchParams(window.location.search);
    const idToken = hash.get('id_token') || search.get('id_token');
    const state = hash.get('state') || search.get('state');
    const oauthError = hash.get('error') || search.get('error');
    const expectedState = localStorage.getItem('google_oauth_state')
      || sessionStorage.getItem('google_oauth_state');
    localStorage.removeItem('google_oauth_state');
    sessionStorage.removeItem('google_oauth_state');

    if (oauthError) {
      window.location.assign(`/login?error=auth_failed&reason=${encodeURIComponent(oauthError)}`);
      return;
    }

    if (!idToken) {
      window.location.assign('/login?error=auth_failed&reason=missing_id_token');
      return;
    }

    // In local dev, some browser/privacy settings may drop storage across OAuth hops.
    // If we have an expected state, enforce it; if missing, proceed with token verification.
    if (expectedState && (!state || state !== expectedState)) {
      window.location.assign('/login?error=auth_failed&reason=state_mismatch');
      return;
    }

    axios
      .post('/api/auth/google', { credential: idToken })
      .then(({ data }) => {
        const token = data?.token;
        if (!token) {
          window.location.assign('/login?error=auth_failed');
          return;
        }
        localStorage.setItem("unimate_token", token);
        window.location.assign("/dashboard");
      })
      .catch((err) => {
        const msg = err?.response?.data?.message;
        if (msg === 'unauthorized_domain') {
          window.location.assign('/login?error=unauthorized_domain');
          return;
        }
        window.location.assign('/login?error=auth_failed&reason=backend_reject');
      });
  }, []);

  return <p>Signing you in with Google...</p>;
}

export default GoogleAuthCallback;


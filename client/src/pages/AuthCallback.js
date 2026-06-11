import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, decodeJwtPayload } from '../context/AuthContext';

function postLoginPath(token) {
  try {
    const payload = decodeJwtPayload(token);
    if (payload.onboarding_done === false) return '/onboarding';
  } catch {
    /* fall through */
  }
  return '/dashboard';
}

function AuthCallback() {
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');
    const reason = params.get('reason');

    if (token) {
      login(token);
      // Full navigation so AuthProvider re-reads localStorage; avoids a race where
      // client-side navigate runs before token/user state is visible to ProtectedRoute.
      const next = postLoginPath(token);
      window.location.replace(next);
      return;
    }

    if (error) {
      const query = new URLSearchParams({ error });
      if (reason) query.set('reason', reason);
      navigate(`/login?${query.toString()}`, { replace: true });
      return;
    }

    navigate('/login?error=no_token', { replace: true });
  }, [login, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Signing you in...</p>
    </div>
  );
}

export default AuthCallback;

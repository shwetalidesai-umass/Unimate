import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

/** Relative paths use CRA `proxy` when `REACT_APP_API_URL` is unset */
function apiUrl(path) {
  const base = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
  return base ? `${base}${path}` : path;
}

export function decodeJwtPayload(token) {
  const [, rawPayload] = String(token || '').split('.');
  if (!rawPayload) throw new Error('Invalid JWT format');

  const base64 = rawPayload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return JSON.parse(atob(padded));
}

function userFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return {
    ...payload,
    full_name: payload.full_name ?? payload.name,
  };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('unimate_token'));
  const [user, setUser] = useState(null);

  const login = useCallback((newToken) => {
    try {
      const normalized = userFromPayload(decodeJwtPayload(newToken));
      localStorage.setItem('unimate_token', newToken);
      setToken(newToken);
      setUser(normalized);
    } catch {
      console.error('Invalid token');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
    } catch {
      /* ignore */
    }
    localStorage.removeItem('unimate_token');
    setToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/auth/token/refresh'), {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.accessToken) login(data.accessToken);
      else await logout();
    } catch {
      await logout();
    }
  }, [login, logout]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    try {
      setUser(userFromPayload(decodeJwtPayload(token)));
    } catch {
      localStorage.removeItem('unimate_token');
      setToken(null);
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let timer;
    try {
      const payload = decodeJwtPayload(token);
      const expMs = payload.exp ? payload.exp * 1000 : 0;
      if (!expMs) return undefined;
      const msUntilRefresh = expMs - Date.now() - 60_000;
      timer = setTimeout(() => refresh(), Math.max(msUntilRefresh, 0));
    } catch {
      localStorage.removeItem('unimate_token');
      setToken(null);
      setUser(null);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [token, refresh]);

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

# Frontend ↔ Backend Integration Guide

This document shows the minimal changes needed in the existing React code
to wire it up to the new Express + PostgreSQL backend.

---

## 1 — AuthContext.js

Replace the mock token with real token storage and auto-refresh.

```js
// client/src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);
const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('unimate_token'));
  const [user,  setUser]  = useState(null);

  // Decode the JWT payload (no verification — server already verified it)
  useEffect(() => {
    if (!token) { setUser(null); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Access tokens expire in 15 min — refresh 1 min before
      const msUntilRefresh = (payload.exp * 1000) - Date.now() - 60_000;
      const timer = setTimeout(refresh, Math.max(msUntilRefresh, 0));
      setUser(payload);
      return () => clearTimeout(timer);
    } catch {
      setToken(null);
    }
  }, [token]);

  const login = (newToken) => {
    localStorage.setItem('unimate_token', newToken);
    setToken(newToken);
  };

  const logout = async () => {
    await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    localStorage.removeItem('unimate_token');
    setToken(null);
    setUser(null);
  };

  const refresh = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/api/auth/token/refresh`, {
        method: 'POST', credentials: 'include'
      });
      const data = await res.json();
      if (data.accessToken) login(data.accessToken);
      else logout();
    } catch {
      logout();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
```

---

## 2 — GoogleSignInButton.js

Point the button at the backend's OAuth entry point instead of doing anything client-side.

```js
// client/src/components/auth/GoogleSignInButton.js
import React from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export default function GoogleSignInButton() {
  return (
    <a href={`${API}/api/auth/google`} className="google-btn">
      Sign in with Google
    </a>
  );
}
```

The button is now a plain anchor tag — clicking it redirects the browser to
Google, then Google redirects to `/api/auth/google/callback`, which redirects
to `/auth/callback?token=<jwt>` where `AuthCallback.js` picks it up (no
changes needed there).

---

## 3 — OnboardingCard.js

Submit the form data to the backend's onboarding endpoint.

```js
// Inside the form onSubmit handler in OnboardingCard.js
const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

async function handleSubmit(event) {
  event.preventDefault();
  const body =
    step === 1
      ? { step: 1, school, class_year: classYear, major }
      : { step: 2, courses: courseCodes, availability };

  const res = await fetch(`${API}/api/auth/onboarding`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${token}`,   // from useAuth()
    },
    body: JSON.stringify(body),
  });

  if (res.ok) onNext();
  else console.error(await res.json());
}
```

---

## 4 — DashboardPage.js

Replace the hardcoded `POSTS`, `QUESTIONS`, `ACTIVITY`, and stat values with
live fetches. Here is a minimal `useDashboard` hook:

```js
// client/src/hooks/useDashboard.js
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

function apiFetch(path, token) {
  return fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  }).then(r => r.json());
}

export function useDashboard({ tagFilter, search }) {
  const { token } = useAuth();
  const [stats,    setStats]    = useState(null);
  const [posts,    setPosts]    = useState([]);
  const [questions,setQuestions]= useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    if (!token) return;
    apiFetch('/api/dashboard/stats', token).then(setStats);
    apiFetch('/api/dashboard/activity?limit=7', token).then(setActivity);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const qs = new URLSearchParams();
    if (tagFilter && tagFilter !== 'All') qs.set('tag', tagFilter);
    if (search) qs.set('search', search);
    apiFetch(`/api/dashboard/collab-posts?${qs}`, token).then(setPosts);
  }, [token, tagFilter, search]);

  useEffect(() => {
    if (!token) return;
    apiFetch('/api/dashboard/questions?sort=hot&limit=5', token).then(setQuestions);
  }, [token]);

  return { stats, posts, questions, activity };
}
```

Then in `DashboardPage.js` replace the constants with:

```js
const { stats, posts, questions, activity } = useDashboard({ tagFilter, search });
```

And update the stat cards:

```js
<StatCard label="OPEN POSTS"          target={stats?.open_posts         ?? 0} delta={`+${stats?.open_posts_delta ?? 0} today`} />
<StatCard label="ACTIVE DISCUSSIONS"  target={stats?.active_discussions ?? 0} delta={`+${stats?.discussions_delta ?? 0} today`} />
<StatCard label="REVIEWS POSTED"      target={stats?.reviews_posted     ?? 0} delta="this semester" deltaColor="#f5a623" />
```

---

## 5 — Environment variable

Add to `client/.env`:

```
REACT_APP_API_URL=http://localhost:4000
```

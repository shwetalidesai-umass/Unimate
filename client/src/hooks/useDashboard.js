import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../apiUrl';

function apiFetch(path, token) {
  return fetch(apiUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  }).then(r => r.json());
}

export function useDashboard({ tagFilter, search }) {
  const { token } = useAuth();
  const [stats,     setStats]     = useState(null);
  const [posts,     setPosts]     = useState([]);
  const [questions, setQuestions] = useState([]);
  const [activity,  setActivity]  = useState([]);

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
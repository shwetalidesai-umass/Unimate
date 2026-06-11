// useReviews.js — UniMate Reviews Hook
// Handles all API calls for the Reviews page
// Used only by ReviewsPage.js

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../apiUrl';

// Helper — every request needs the Bearer token
function apiFetch(path, token, options = {}) {
  return fetch(apiUrl(path), {
    ...options,
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  }).then(r => r.json());
}

export function useReviews() {
  const { token } = useAuth();

  // ── Lists for dropdowns ──────────────────────────────────────
  const [courses,    setCourses]    = useState([]);
  const [professors, setProfessors] = useState([]);

  // ── Selected item and its reviews ───────────────────────────
  const [selectedCourse,    setSelectedCourse]    = useState(null);
  const [selectedProfessor, setSelectedProfessor] = useState(null);
  const [courseDetail,      setCourseDetail]      = useState(null);
  const [professorDetail,   setProfessorDetail]   = useState(null);

  // ── UI state ─────────────────────────────────────────────────
  const [loading,    setLoading]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);
  const [submitMsg,  setSubmitMsg]  = useState(null); // success or error msg after submit

  // ── Load courses and professors once on mount ────────────────
  useEffect(() => {
    if (!token) return;
    apiFetch('/api/reviews/courses',    token).then(setCourses).catch(console.error);
    apiFetch('/api/reviews/professors', token).then(setProfessors).catch(console.error);
  }, [token]);

  // ── Load course detail when a course is selected ─────────────
  useEffect(() => {
    if (!token || !selectedCourse) { setCourseDetail(null); return; }
    setLoading(true);
    apiFetch(`/api/reviews/courses/${selectedCourse}`, token)
      .then(setCourseDetail)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, selectedCourse]);

  // ── Load professor detail when a professor is selected ────────
  useEffect(() => {
    if (!token || !selectedProfessor) { setProfessorDetail(null); return; }
    setLoading(true);
    apiFetch(`/api/reviews/professors/${selectedProfessor}`, token)
      .then(setProfessorDetail)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, selectedProfessor]);

  // ── Submit a course review ────────────────────────────────────
  const submitCourseReview = useCallback(async (courseId, rating, body) => {
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const data = await apiFetch(`/api/reviews/courses/${courseId}`, token, {
        method: 'POST',
        body: JSON.stringify({ rating, body }),
      });
      if (data.error) {
        setSubmitMsg({ type: 'error', text: data.error });
        return false;
      }
      // Refresh the course detail to show the new review
      const updated = await apiFetch(`/api/reviews/courses/${courseId}`, token);
      setCourseDetail(updated);
      setSubmitMsg({ type: 'success', text: 'Review submitted successfully!' });
      return true;
    } catch (err) {
      setSubmitMsg({ type: 'error', text: 'Something went wrong. Please try again.' });
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [token]);

  // ── Submit a professor review ─────────────────────────────────
  const submitProfessorReview = useCallback(async (professorId, rating, body) => {
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const data = await apiFetch(`/api/reviews/professors/${professorId}`, token, {
        method: 'POST',
        body: JSON.stringify({ rating, body }),
      });
      if (data.error) {
        setSubmitMsg({ type: 'error', text: data.error });
        return false;
      }
      // Refresh the professor detail to show the new review
      const updated = await apiFetch(`/api/reviews/professors/${professorId}`, token);
      setProfessorDetail(updated);
      setSubmitMsg({ type: 'success', text: 'Review submitted successfully!' });
      return true;
    } catch (err) {
      setSubmitMsg({ type: 'error', text: 'Something went wrong. Please try again.' });
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [token]);

  // ── Clear submit message after 4 seconds ─────────────────────
  useEffect(() => {
    if (!submitMsg) return;
    const t = setTimeout(() => setSubmitMsg(null), 4000);
    return () => clearTimeout(t);
  }, [submitMsg]);

  return {
    // Dropdown data
    courses,
    professors,
    // Selection
    selectedCourse,    setSelectedCourse,
    selectedProfessor, setSelectedProfessor,
    // Detail data (reviews + avg rating)
    courseDetail,
    professorDetail,
    // UI state
    loading,
    submitting,
    error,
    submitMsg,
    // Actions
    submitCourseReview,
    submitProfessorReview,
  };
}
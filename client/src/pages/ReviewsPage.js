import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useReviews } from '../hooks/useReviews';
import './ReviewsPage.css';

// ── Star Rating component (unchanged from original) ───────────
function StarRating({ value, onChange, readonly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="stars">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          className={`star ${n <= (hover || value) ? 'filled' : ''}`}
          onClick={() => !readonly && onChange && onChange(n)}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(0)}
          disabled={readonly}
          type="button"
        >★</button>
      ))}
    </div>
  );
}

// ── Review Card component (unchanged from original) ───────────
function ReviewCard({ review }) {
  return (
    <div className="rev-card">
      <div className="rev-card-header">
        <div>
          <p className="rev-target">{review.target}</p>
          <StarRating value={review.rating} readonly />
        </div>
        <div className="rev-meta">
          <span className="rev-author">{review.author}</span>
          <span className="rev-date">{review.date}</span>
        </div>
      </div>
      <p className="rev-body">{review.body}</p>
    </div>
  );
}

// ── Helper: format a date string into "Apr 2026" style ────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ── Main Page ─────────────────────────────────────────────────
export default function ReviewsPage() {
  const { logout } = useAuth();
  const navigate   = useNavigate();

  const [tab, setTab] = useState('courses');
  const [rating,     setRating]     = useState(0);
  const [reviewText, setReviewText] = useState('');

  const {
    courses, professors,
    selectedCourse,    setSelectedCourse,
    selectedProfessor, setSelectedProfessor,
    courseDetail, professorDetail,
    loading, submitting, submitMsg,
    submitCourseReview, submitProfessorReview,
  } = useReviews();

  const activeDetail = tab === 'courses' ? courseDetail : professorDetail;

  const reviews = (activeDetail?.reviews || []).map(r => ({
    id:     r.id,
    target: activeDetail.code || activeDetail.full_name || '',
    rating: r.rating,
    body:   r.body || '',
    date:   formatDate(r.created_at),
    author: r.reviewer_name || 'Student',
  }));

  const handleTabSwitch = (newTab) => {
    setTab(newTab);
    setRating(0);
    setReviewText('');
    setSelectedCourse(null);
    setSelectedProfessor(null);
  };

  const handleSubmit = async () => {
    if (!rating || !reviewText.trim()) return;
    let success = false;
    if (tab === 'courses' && selectedCourse) {
      success = await submitCourseReview(selectedCourse, rating, reviewText);
    } else if (tab === 'professors' && selectedProfessor) {
      success = await submitProfessorReview(selectedProfessor, rating, reviewText);
    }
    if (success) {
      setRating(0);
      setReviewText('');
    }
  };

  const totalReviews  = activeDetail?.review_count ?? '—';
  const avgRating     = activeDetail?.avg_rating   ?? '—';
  const itemsReviewed = tab === 'courses' ? courses.length : professors.length;
  const selectedId    = tab === 'courses' ? selectedCourse : selectedProfessor;
  const canSubmit     = rating > 0 && reviewText.trim().length > 0 && selectedId;

  return (
    <div className="rev-root">
      <div className="rev-ambient" />

      <header className="rev-topbar">
        <button className="rev-back" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
        <div className="rev-logo">
          <img src="/logo.png" alt="UniMate" style={{ width: '42px', height: '42px', borderRadius: '9px' }} />
          <span className="rev-logo-name">UniMate</span>
        </div>
        <button className="rev-logout" onClick={logout}>Sign out</button>
      </header>

      <main className="rev-body">
        <div className="rev-feed">
          <h1 className="rev-heading">Reviews</h1>
          <p className="rev-sub">Honest feedback from the Five College community</p>

          <div className="rev-tabs">
            <button
              className={`rev-tab ${tab === 'courses' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('courses')}
            >Courses</button>
            <button
              className={`rev-tab ${tab === 'professors' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('professors')}
            >Professors</button>
          </div>

          <div className="rev-list">
            {loading ? (
              <div className="rev-more-soon"><p>Loading reviews…</p></div>
            ) : reviews.length > 0 ? (
              reviews.map(r => <ReviewCard key={r.id} review={r} />)
            ) : (
              <div className="rev-more-soon">
                <p>
                  {selectedId
                    ? 'No reviews yet — be the first to write one!'
                    : `Select a ${tab === 'courses' ? 'course' : 'professor'} from the form to see reviews`}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rev-panel">
          <div className="rev-form-card">
            <h2 className="rev-form-title">Write a Review</h2>
            <p className="rev-form-sub">Share your experience to help other students</p>

            <div className="rev-field">
              <label className="rev-label">
                {tab === 'courses' ? 'Select a course' : 'Select a professor'}
              </label>
              <select
                className="rev-input"
                aria-label={tab === 'courses' ? 'Select a course' : 'Select a professor'}
                value={tab === 'courses' ? (selectedCourse || '') : (selectedProfessor || '')}
                onChange={e => {
                  const val = e.target.value || null;
                  if (tab === 'courses') setSelectedCourse(val);
                  else setSelectedProfessor(val);
                  setRating(0);
                  setReviewText('');
                }}
              >
                <option value="">
                  {tab === 'courses' ? '— Choose a course —' : '— Choose a professor —'}
                </option>
                {tab === 'courses'
                  ? courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.code}{c.title ? ` — ${c.title}` : ''}
                      </option>
                    ))
                  : professors.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))
                }
              </select>
            </div>

            <div className="rev-field">
              <label className="rev-label">Your rating</label>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <div className="rev-field">
              <label className="rev-label">Your review</label>
              <textarea
                className="rev-textarea"
                placeholder="What should other students know? Be honest and specific."
                rows={5}
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
              />
              <span className="rev-char-count">{reviewText.length} / 500</span>
            </div>

            {submitMsg && (
              <div className={submitMsg.type === 'success' ? 'rev-success' : 'rev-error'}>
                {submitMsg.text}
              </div>
            )}

            {!submitMsg && (
              <button
                className={`rev-submit ${!canSubmit ? 'disabled' : ''}`}
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
              >
                {submitting ? 'Submitting…' : 'Submit Review'}
              </button>
            )}
          </div>

          <div className="rev-mini-stats">
            <div className="rev-mini-stat">
              <span className="rev-mini-val">{totalReviews}</span>
              <span className="rev-mini-label">Total reviews</span>
            </div>
            <div className="rev-mini-stat">
              <span className="rev-mini-val">{avgRating}</span>
              <span className="rev-mini-label">Avg rating</span>
            </div>
            <div className="rev-mini-stat">
              <span className="rev-mini-val">{itemsReviewed}</span>
              <span className="rev-mini-label">
                {tab === 'courses' ? 'Courses' : 'Professors'}
              </span>
            </div>
          </div>
      </div>
    </main>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../apiUrl';
import './DashboardPage.css';

export default function DiscussionsPage() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answersByQuestion, setAnswersByQuestion] = useState({});
  const [showAnswersFor, setShowAnswersFor] = useState(null);
  const [error, setError] = useState('');
  const [questionForm, setQuestionForm] = useState({ courseCode: '', body: '' });
  const [answerDrafts, setAnswerDrafts] = useState({});
  const [availableCourses, setAvailableCourses] = useState([]);

  const displayName = user?.full_name || user?.name || user?.email || 'Student';
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    axios.get(apiUrl('/api/dashboard/courses/all'), {
      headers: authHeaders,
    }).then(res => setAvailableCourses(res.data?.courses || [])).catch(console.error);
  }, [token]);

  const fetchQuestions = async () => {
    if (!token) return;
    try {
      const res = await axios.get(apiUrl('/api/discussions/questions'), { headers: authHeaders });
      setQuestions(res.data?.questions || []);
    } catch (err) {
      setError('Could not load discussions.');
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [token]);

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (!questionForm.courseCode.trim() || !questionForm.body.trim()) return;
    setError('');
    try {
      await axios.post(apiUrl('/api/discussions/questions'), {
        courseCode: questionForm.courseCode.trim(),
        body: questionForm.body.trim(),
      }, { headers: authHeaders });
      setQuestionForm({ courseCode: '', body: '' });
      fetchQuestions();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not create question.');
    }
  };

  const toggleAnswers = async (questionId) => {
    if (showAnswersFor === questionId) {
      setShowAnswersFor(null);
      return;
    }
    try {
      const res = await axios.get(apiUrl(`/api/discussions/questions/${questionId}/answers`), {
        headers: authHeaders,
      });
      setAnswersByQuestion((current) => ({ ...current, [questionId]: res.data?.answers || [] }));
      setShowAnswersFor(questionId);
    } catch (err) {
      setError('Could not load answers.');
    }
  };

  const handleVote = async (questionId, direction) => {
    try {
      await axios.post(apiUrl(`/api/discussions/questions/${questionId}/vote`), { direction }, {
        headers: authHeaders,
      });
      fetchQuestions();
    } catch (err) {
      setError('Could not submit vote.');
    }
  };

  const handleAnswer = async (questionId) => {
    const body = (answerDrafts[questionId] || '').trim();
    if (!body) return;
    setError('');
    try {
      await axios.post(apiUrl(`/api/discussions/questions/${questionId}/answers`), { body }, {
        headers: authHeaders,
      });
      setAnswerDrafts((current) => ({ ...current, [questionId]: '' }));
      const res = await axios.get(apiUrl(`/api/discussions/questions/${questionId}/answers`), {
        headers: authHeaders,
      });
      setAnswersByQuestion((current) => ({ ...current, [questionId]: res.data?.answers || [] }));
      setShowAnswersFor(questionId);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not submit answer.');
    }
  };

  return (
    <div className="dash-root">
      <div className="dash-ambient-1" />
      <div className="dash-ambient-2" />
      <aside className="dash-sidebar">
        <div className="dash-logo">
          <img src="/logo.png" alt="UniMate" style={{ width: 42, height: 42, borderRadius: 9 }} />
          <span className="dash-logo-text">UniMate</span>
        </div>
        <nav className="dash-nav">
          {[
            { icon: '⊞', label: 'Dashboard', path: '/dashboard', active: false },
            { icon: '◎', label: 'Collaborate', path: '/collaborate', active: false },
            { icon: '◷', label: 'Discussions', path: '/discussions', active: true },
            { icon: '★', label: 'Reviews', path: '/reviews', active: false },
          ].map((item) => (
            <button key={item.label} className={`dash-nav-item ${item.active ? 'active' : ''}`} onClick={() => navigate(item.path)}>
              <span className="dash-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.active && <span className="dash-nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="dash-sidebar-footer">
          <div className="dash-avatar">{initials}</div>
          <div className="dash-user-info">
            <p className="dash-user-name">{displayName}</p>
            <p className="dash-user-uni">{(user?.email || '').split('@')[1] || 'Five College'}</p>
          </div>
          <button className="dash-logout" onClick={logout} title="Logout">↩</button>
        </div>
      </aside>

      <main className="dash-main">
        <header className="dash-header">
          <p className="dash-greeting">Ask and answer course-specific questions</p>
          <h1 className="dash-name">Discussions</h1>
        </header>
        {error && <p style={{ color: '#ff8f8f', marginBottom: 12 }}>{error}</p>}

        <form className="dash-card dash-create-collab-form" onSubmit={handleCreateQuestion} style={{ marginBottom: 16 }}>
          <h2 className="dash-card-title">Start a New Question</h2>
          <select
            className="dash-search dash-create-collab-field"
            aria-label="Select a course"
            style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px' }}
            value={questionForm.courseCode}
            onChange={(e) => setQuestionForm((c) => ({ ...c, courseCode: e.target.value }))}
          >
            <option value="">— Select a course —</option>
            {availableCourses.map(course => (
              <option key={course.id} value={course.code}>
                {course.code}{course.title ? ` — ${course.title}` : ''}
              </option>
            ))}
          </select>
          <input
            className="dash-search dash-create-collab-field"
            style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px' }}
            placeholder="Your question"
            value={questionForm.body}
            onChange={(e) => setQuestionForm((c) => ({ ...c, body: e.target.value }))}
          />
          <div className="dash-create-collab-footer">
            <button className="dash-join-btn" type="submit">Post Question</button>
          </div>
        </form>

        <div className="dash-discuss-list">
          {questions.map((q) => (
            <div key={q.id} className="dash-discuss-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="dash-discuss-votes">
                  <span className="dash-vote-num">{q.votes}</span>
                  <span className="dash-vote-label">votes</span>
                </div>
                <div className="dash-discuss-center">
                  <div className="dash-discuss-top-row">
                    <span className="dash-course-badge">{q.course_code}</span>
                  </div>
                  <p className="dash-discuss-q">{q.body}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button className="dash-join-btn" type="button" onClick={() => handleVote(q.id, 'up')}>Upvote</button>
                  <button className="dash-join-btn" type="button" onClick={() => handleVote(q.id, 'down')}>Downvote</button>
                  <button className="dash-join-btn" type="button" onClick={() => toggleAnswers(q.id)}>
                    {showAnswersFor === q.id ? 'Hide Answers' : 'View Answers'}
                  </button>
                </div>
              </div>

              {showAnswersFor === q.id && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  {(answersByQuestion[q.id] || []).map((a) => (
                    <div key={a.id} className="dash-card" style={{ marginBottom: 8 }}>
                      <p className="dash-members">{a.body}</p>
                    </div>
                  ))}
                  {!((answersByQuestion[q.id] || []).length) && <p className="dash-members">No answers yet.</p>}
                  <div className="dash-create-collab-form" style={{ marginTop: 8 }}>
                    <input
                      className="dash-search dash-create-collab-field"
                      style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px' }}
                      placeholder="Write an answer"
                      value={answerDrafts[q.id] || ''}
                      onChange={(e) => setAnswerDrafts((current) => ({ ...current, [q.id]: e.target.value }))}
                    />
                    <div className="dash-create-collab-footer">
                      <button className="dash-join-btn" type="button" onClick={() => handleAnswer(q.id)}>Post Answer</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!questions.length && <div className="dash-discuss-coming">No discussions yet</div>}
        </div>
      </main>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../apiUrl';
import './DashboardPage.css';

const TAGS = ['All', 'Project', 'Study', 'Homework', 'Exam'];
const TAG_COLORS = {
  Project: { bg: '#1a2744', text: '#6ea8fe', border: '#2d4a8a' },
  Study: { bg: '#1a2e1a', text: '#5cb85c', border: '#2d5a2d' },
  Homework: { bg: '#2e1a2e', text: '#c77dff', border: '#5a2d8a' },
  Exam: { bg: '#2e1a1a', text: '#ff6b6b', border: '#8a2d2d' },
};

export default function CollaboratePage() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [tagFilter, setTagFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [viewPostId, setViewPostId] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [form, setForm] = useState({
    courseCode: '',
    title: '',
    tag: 'Project',
    maxMembers: '',
  });

  const displayName = user?.full_name || user?.name || user?.email || 'Student';
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    axios.get(apiUrl('/api/dashboard/courses/all'), {
      headers: authHeaders,
    }).then(res => setAvailableCourses(res.data?.courses || [])).catch(console.error);
  }, [token]);

  const fetchPosts = async () => {
    if (!token) return;
    try {
      const params = {};
      if (tagFilter !== 'All') params.tag = tagFilter;
      const res = await axios.get(apiUrl('/api/collab/posts'), {
        headers: authHeaders,
        params,
      });
      setPosts(res.data?.posts || []);
    } catch (err) {
      setError('Could not load collaboration posts.');
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [token, tagFilter]);

  const viewPost = viewPostId ? posts.find((p) => p.id === viewPostId) : null;

  useEffect(() => {
    if (viewPostId && !posts.some((p) => p.id === viewPostId)) {
      setViewPostId(null);
    }
  }, [posts, viewPostId]);

  useEffect(() => {
    if (!viewPostId) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setViewPostId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewPostId]);

  const filteredPosts = posts.filter((p) => {
    const text = `${p.course_code || ''} ${p.title || ''}`.toLowerCase();
    return text.includes(search.trim().toLowerCase());
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.courseCode.trim() || !form.title.trim()) {
      setError('Please enter a course code and post title.');
      return;
    }
    const n = Number(form.maxMembers);
    const maxMembers =
      form.maxMembers === '' || !Number.isFinite(n)
        ? 4
        : Math.min(20, Math.max(1, n));
    try {
      await axios.post(apiUrl('/api/collab/posts'), {
        courseCode: form.courseCode.trim(),
        title: form.title.trim(),
        tag: form.tag,
        maxMembers,
      }, { headers: authHeaders });
      setForm({ courseCode: '', title: '', tag: 'Project', maxMembers: '' });
      fetchPosts();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not create post.');
    }
  };

  const handleJoin = async (postId) => {
    try {
      await axios.post(apiUrl(`/api/collab/posts/${postId}/join`), {}, { headers: authHeaders });
      fetchPosts();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not join post.');
    }
  };

  const handleLeave = async (postId) => {
    try {
      await axios.post(apiUrl(`/api/collab/posts/${postId}/leave`), {}, { headers: authHeaders });
      fetchPosts();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not leave post.');
    }
  };

  const closeViewPostModal = () => {
    setViewPostId(null);
  };

  const handleSetChatLink = async (postId) => {
    const chatLink = window.prompt('Paste Google Chat link for this formed group');
    if (!chatLink) return;
    try {
      await axios.patch(apiUrl(`/api/collab/posts/${postId}/chat-link`), { chatLink }, {
        headers: authHeaders,
      });
      fetchPosts();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not set chat link.');
    }
  };

  const handleOpenChatLink = async (postId) => {
    try {
      const res = await axios.get(apiUrl(`/api/collab/posts/${postId}/chat-link`), {
        headers: authHeaders,
      });
      if (res.data?.chatLink) window.open(res.data.chatLink, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not open chat link.');
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
            { icon: '◎', label: 'Collaborate', path: '/collaborate', active: true },
            { icon: '◷', label: 'Discussions', path: '/discussions', active: false },
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
          <p className="dash-greeting">Collaborate with your classmates</p>
          <h1 className="dash-name">Collaboration Posts</h1>
        </header>
        {error && <p style={{ color: '#ff8f8f', marginBottom: 12 }}>{error}</p>}

        <form className="dash-card dash-create-collab-form" onSubmit={handleCreate} style={{ marginBottom: 16 }}>
          <h2 className="dash-card-title">Create New Post</h2>
          <select
            className="dash-search dash-create-collab-field"
            aria-label="Select a course"
            style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px' }}
            value={form.courseCode}
            onChange={(e) => setForm((c) => ({ ...c, courseCode: e.target.value }))}
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
            placeholder="Post title"
            value={form.title}
            onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
          />
          <select
            className="dash-search dash-create-collab-field"
            style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px' }}
            aria-label="Post category"
            value={form.tag}
            onChange={(e) => setForm((c) => ({ ...c, tag: e.target.value }))}
          >
            {TAGS.filter((t) => t !== 'All').map((tag) => <option key={tag} value={tag}>{tag}</option>)}
          </select>
          <input
            className="dash-search dash-create-collab-field"
            style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px' }}
            type="number"
            min={1}
            max={20}
            inputMode="numeric"
            placeholder="Max members (1–20)"
            value={form.maxMembers}
            onChange={(e) => setForm((c) => ({ ...c, maxMembers: e.target.value }))}
          />
          <div className="dash-create-collab-footer">
            <button className="dash-join-btn" type="submit">Create Post</button>
          </div>
        </form>

        <div className="dash-filters">
          <input className="dash-search" style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px' }} placeholder="Search courses/posts" value={search} onChange={(e) => setSearch(e.target.value)} />
          {TAGS.map((tag) => (
            <button key={tag} className={`dash-filter-btn ${tagFilter === tag ? 'active' : ''}`} onClick={() => setTagFilter(tag)} type="button">{tag}</button>
          ))}
        </div>

        <div className="dash-grid">
          {filteredPosts.map((post) => {
            const memberCount = Number(post.member_count || 0);
            const maxMembers = Number(post.max_members || 1);
            const isFull = memberCount >= maxMembers;
            const isAuthor = Boolean(post.is_author);
            const isMember = Boolean(post.is_member);
            const colors = TAG_COLORS[post.tag] || TAG_COLORS.Project;
            const pct = maxMembers ? (memberCount / maxMembers) * 100 : 0;
            const canOpenGroupChat = isAuthor || isMember;
            return (
              <div
                key={post.id}
                className="dash-card"
                style={{ cursor: canOpenGroupChat ? 'pointer' : undefined }}
                onClick={() => {
                  if (canOpenGroupChat) navigate(`/collaborate/${post.id}/chat`);
                }}
              >
                <div className="dash-card-glow" style={{ background: colors.text }} />
                <div className="dash-card-top">
                  <span className="dash-course-badge">{post.course_code}</span>
                  <span className="dash-tag" style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>{post.tag}</span>
                </div>
                <h3 className="dash-card-title">{post.title}</h3>
                <div className="dash-card-footer">
                  <div className="dash-progress-wrap">
                    <div className="dash-progress-bar">
                      <div className="dash-progress-fill" style={{ width: `${pct}%`, background: isFull ? '#ff6b6b' : colors.text }} />
                    </div>
                    <span className="dash-members">{memberCount}/{maxMembers} members{isFull ? ' · Full' : ''}</span>
                  </div>
                  <div className="dash-collab-card-actions" onClick={(e) => e.stopPropagation()}>
                    {isAuthor ? (
                      <button
                        className="dash-join-btn"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewPostId(post.id);
                        }}
                        aria-haspopup="dialog"
                        aria-expanded={viewPostId === post.id}
                      >
                        Your Post
                      </button>
                    ) : isMember ? (
                      <button className="dash-join-btn" type="button" onClick={(e) => { e.stopPropagation(); handleLeave(post.id); }}>Leave</button>
                    ) : (
                      <button className="dash-join-btn" type="button" disabled={isFull} onClick={(e) => { e.stopPropagation(); handleJoin(post.id); }}>{isFull ? 'Full' : 'Join →'}</button>
                    )}
                    {post.group_formed && !post.chat_link && isAuthor && (
                      <button className="dash-join-btn" type="button" onClick={(e) => { e.stopPropagation(); handleSetChatLink(post.id); }}>Set Group Chat Link</button>
                    )}
                    {post.group_formed && post.chat_link && isMember && (
                      <button className="dash-join-btn" type="button" onClick={(e) => { e.stopPropagation(); handleOpenChatLink(post.id); }}>Open Group Chat</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!filteredPosts.length && <div className="dash-empty">No collaboration posts found.</div>}
        </div>
      </main>

      {typeof document !== 'undefined' && viewPostId && viewPost
        ? createPortal(
            <div
              className="dash-modal-backdrop"
              role="presentation"
              onClick={closeViewPostModal}
            >
              <div
                className="dash-modal-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="dash-view-post-title"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="dash-modal-close"
                  onClick={closeViewPostModal}
                  aria-label="Close"
                >
                  ×
                </button>
                <h2 id="dash-view-post-title" className="dash-modal-title">Your collaboration post</h2>
                <label className="dash-modal-label" htmlFor="view-post-course">Course code</label>
                <input
                  id="view-post-course"
                  className="dash-modal-field"
                  readOnly
                  tabIndex={-1}
                  value={viewPost.course_code || ''}
                />
                <label className="dash-modal-label" htmlFor="view-post-title-field">Post title</label>
                <input
                  id="view-post-title-field"
                  className="dash-modal-field"
                  readOnly
                  tabIndex={-1}
                  value={viewPost.title || ''}
                />
                <span className="dash-modal-label">Category</span>
                <select
                  className="dash-modal-field"
                  disabled
                  value={viewPost.tag || 'Project'}
                  aria-label="Category (read-only)"
                >
                  {TAGS.filter((t) => t !== 'All').map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
                <label className="dash-modal-label" htmlFor="view-post-max">Max members</label>
                <input
                  id="view-post-max"
                  className="dash-modal-field"
                  readOnly
                  tabIndex={-1}
                  value={String(viewPost.max_members ?? '')}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
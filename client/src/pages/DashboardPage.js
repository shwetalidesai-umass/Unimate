import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import './DashboardPage.css';

const TAG_COLORS = {
  Project:  { bg: '#1a2744', text: '#6ea8fe', border: '#2d4a8a' },
  Study:    { bg: '#1a2e1a', text: '#5cb85c', border: '#2d5a2d' },
  Homework: { bg: '#2e1a2e', text: '#c77dff', border: '#5a2d8a' },
  Exam:     { bg: '#2e1a1a', text: '#ff6b6b', border: '#8a2d2d' },
};

const ACTIVITY_ICONS  = { post: '◎', answer: '◷', review: '★', full: '⊠', join: '⊕' };
const ACTIVITY_COLORS = { post: '#6ea8fe', answer: '#c77dff', review: '#f5a623', full: '#ff6b6b', join: '#5cb85c' };

function useCountUp(target, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

function StatCard({ label, target, delta, deltaColor }) {
  const val = useCountUp(target);
  return (
    <div className="dash-stat-card">
      <p className="dash-stat-label">{label}</p>
      <p className="dash-stat-value">{val}</p>
      <p className="dash-stat-delta" style={{ color: deltaColor || '#5cb85c' }}>{delta}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { logout, user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState('collab');
  const [tagFilter, setTagFilter] = useState('All');
  const [search, setSearch]       = useState('');
  const [time, setTime]           = useState(new Date());
  const navigate = useNavigate();

  const { stats, posts, questions, activity } = useDashboard({ tagFilter, search });

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const displayName = authUser?.full_name || authUser?.email || 'Student';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const greeting = () => {
    const h = time.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const tags = ['All', 'Project', 'Study', 'Homework', 'Exam'];

  return (
    <div className="dash-root">
      <div className="dash-ambient-1" />
      <div className="dash-ambient-2" />

      <aside className="dash-sidebar">
        <div className="dash-logo">
          <img src="/logo.png" alt="UniMate" style={{ width: '42px', height: '42px', borderRadius: '9px' }} />
          <span className="dash-logo-text">UniMate</span>
        </div>
        <nav className="dash-nav">
          {[
            { icon: '⊞', label: 'Dashboard', path: '/dashboard', active: true },
            { icon: '◎', label: 'Collaborate', path: '/collaborate', active: false },
            { icon: '◷', label: 'Discussions', path: '/discussions', active: false },
            { icon: '★', label: 'Reviews', path: '/reviews', active: false },
          ].map(item => (
            <button key={item.label} className={`dash-nav-item ${item.active ? 'active' : ''}`} onClick={() => navigate(item.path)}>
              <span className="dash-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.active && <span className="dash-nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="dash-sprint-badge">
          <span className="dash-sprint-dot" />
          Sprint 2 in progress
        </div>
        <div className="dash-sidebar-footer">
          <div className="dash-avatar" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>{initials}</div>
          <div className="dash-user-info">
            <p className="dash-user-name">{displayName}</p>
            <p className="dash-user-uni">{authUser?.school || ''}</p>
          </div>
          <button className="dash-logout" onClick={logout} title="Logout">↩</button>
        </div>
      </aside>

      <main className="dash-main">
        <div className="dash-topbar">
          <div className="dash-search-wrap">
            <span className="dash-search-icon">⌕</span>
            <input
              className="dash-search"
              placeholder="Search courses, posts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="dash-topbar-right">
            <div className="dash-clock">
              <span className="dash-time">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="dash-date">{time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <header className="dash-header">
          <p className="dash-greeting">{greeting()},</p>
          <h1 className="dash-name">{displayName.split(' ')[0]}</h1>
        </header>

        <div className="dash-stats">
          <StatCard label="OPEN POSTS"         target={stats?.open_posts ?? 0}         delta={`+${stats?.open_posts_delta ?? 0} today`} />
          <StatCard label="ACTIVE DISCUSSIONS" target={stats?.active_discussions ?? 0} delta={`+${stats?.discussions_delta ?? 0} today`} />
          <StatCard label="REVIEWS POSTED"     target={stats?.reviews_posted ?? 0}     delta="this semester" deltaColor="#f5a623" />
        </div>

        <div className="dash-body-grid">
          <div className="dash-feed">
            <div className="dash-tabs">
              <button className={`dash-tab ${activeTab === 'collab' ? 'active' : ''}`} onClick={() => setActiveTab('collab')}>Collaboration Posts</button>
              <button className={`dash-tab ${activeTab === 'discuss' ? 'active' : ''}`} onClick={() => setActiveTab('discuss')}>Recent Discussions</button>
            </div>

            {activeTab === 'collab' && (
              <>
                <div className="dash-filters">
                  {tags.map(t => (
                    <button
                      key={t}
                      className={`dash-filter-btn ${tagFilter === t ? 'active' : ''}`}
                      onClick={() => setTagFilter(t)}
                      style={tagFilter === t && t !== 'All' ? {
                        background: TAG_COLORS[t]?.bg,
                        color: TAG_COLORS[t]?.text,
                        border: `1px solid ${TAG_COLORS[t]?.border}`
                      } : {}}
                    >{t}</button>
                  ))}
                </div>
                <div className="dash-grid">
                  {posts.map(post => {
                    const colors = TAG_COLORS[post.tag] || TAG_COLORS.Project;
                    const pct = (post.member_count / post.max_members) * 100;
                    const isFull = post.member_count >= post.max_members;
                    return (
                      <div key={post.id} className="dash-card">
                        <div className="dash-card-glow" style={{ background: colors.text }} />
                        <div className="dash-card-top">
                          <span className="dash-course-badge">{post.course}</span>
                          <span className="dash-tag" style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>{post.tag}</span>
                        </div>
                        <h3 className="dash-card-title">{post.title}</h3>
                        <div className="dash-card-footer">
                          <div className="dash-progress-wrap">
                            <div className="dash-progress-bar">
                              <div className="dash-progress-fill" style={{ width: `${pct}%`, background: isFull ? '#ff6b6b' : colors.text }} />
                            </div>
                            <span className="dash-members">{post.member_count}/{post.max_members} members{isFull ? ' · Full' : ''}</span>
                          </div>
                          <button className="dash-join-btn" style={{ borderColor: colors.border, color: colors.text }} disabled={isFull || post.is_member}>
                            {isFull ? 'Full' : post.is_member ? 'Joined' : 'Join →'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {posts.length === 0 && <div className="dash-empty">No posts yet</div>}
                  <button
                    type="button"
                    className="dash-card dash-card-new"
                    onClick={() => navigate('/collaborate')}
                    aria-label="Create a new collaboration post"
                  >
                    <span className="dash-new-icon">+</span>
                    <span className="dash-new-label">New Post</span>
                    <span className="dash-new-sub">Open collaborate form</span>
                  </button>
                </div>
              </>
            )}

            {activeTab === 'discuss' && (
              <div className="dash-discuss-list">
                {questions.map(q => (
                  <div key={q.id} className="dash-discuss-item">
                    <div className="dash-discuss-votes">
                      <span className="dash-vote-num">{q.votes}</span>
                      <span className="dash-vote-label">votes</span>
                    </div>
                    <div className="dash-discuss-center">
                      <div className="dash-discuss-top-row">
                        <span className="dash-course-badge">{q.course}</span>
                        {q.votes > 10 && <span className="dash-hot-badge">hot</span>}
                      </div>
                      <p className="dash-discuss-q">{q.question}</p>
                    </div>
                    <div className="dash-discuss-right">
                      <span className="dash-answer-count">{q.answer_count} answers</span>
                    </div>
                  </div>
                ))}
                {questions.length === 0 && <div className="dash-discuss-coming">No discussions yet</div>}
              </div>
            )}
          </div>

          <div className="dash-activity">
            <h2 className="dash-activity-title">Live Activity</h2>
            <div className="dash-activity-list">
              {activity.map((a, i) => (
                <div key={a.id} className="dash-activity-item" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="dash-activity-icon" style={{ color: ACTIVITY_COLORS[a.type] }}>{ACTIVITY_ICONS[a.type]}</span>
                  <div className="dash-activity-body">
                    <p className="dash-activity-text">{a.text}</p>
                    <span className="dash-activity-time">{a.created_at}</span>
                  </div>
                </div>
              ))}
              {activity.length === 0 && <div className="dash-activity-item">No activity yet</div>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
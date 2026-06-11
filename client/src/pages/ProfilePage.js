import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../apiUrl';
import './DashboardPage.css';

export default function ProfilePage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch(apiUrl('/api/auth/me'), {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setProfile(data))
      .catch(console.error);
  }, [token]);

  const displayName = profile?.full_name || user?.full_name || 'Student';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const courses = profile?.courses || [];

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
            { icon: '⊞', label: 'Dashboard', path: '/dashboard', active: false },
            { icon: '◎', label: 'Collaborate', path: '/collaborate', active: false },
            { icon: '◷', label: 'Discussions', path: '/discussions', active: false },
            { icon: '★', label: 'Reviews', path: '/reviews', active: false },
          ].map(item => (
            <button key={item.label} className={`dash-nav-item ${item.active ? 'active' : ''}`} onClick={() => navigate(item.path)}>
              <span className="dash-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="dash-sidebar-footer">
          <div className="dash-avatar">{initials}</div>
          <div className="dash-user-info">
            <p className="dash-user-name">{displayName}</p>
            <p className="dash-user-uni">{profile?.school || ''}</p>
          </div>
          <button className="dash-logout" onClick={logout} title="Logout">↩</button>
        </div>
      </aside>

      <main className="dash-main">
        <header className="dash-header">
          <p className="dash-greeting">Your Profile</p>
          <h1 className="dash-name">{displayName.split(' ')[0]}</h1>
        </header>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '24px' }}>

          <div className="dash-stat-card" style={{ flex: '1', minWidth: '280px', padding: '24px' }}>
            <h2 style={{ color: '#e2e8f0', marginBottom: '20px', fontSize: '1rem', letterSpacing: '0.05em' }}>PERSONAL INFO</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '4px' }}>FULL NAME</p>
                <p style={{ color: '#e2e8f0' }}>{profile?.full_name || '—'}</p>
              </div>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '4px' }}>EMAIL</p>
                <p style={{ color: '#e2e8f0' }}>{profile?.email || '—'}</p>
              </div>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '4px' }}>SCHOOL</p>
                <p style={{ color: '#e2e8f0', textTransform: 'capitalize' }}>{profile?.school?.replace('_', ' ') || '—'}</p>
              </div>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '4px' }}>CLASS YEAR</p>
                <p style={{ color: '#e2e8f0' }}>{profile?.class_year || '—'}</p>
              </div>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '4px' }}>MAJOR</p>
                <p style={{ color: '#e2e8f0' }}>{profile?.major || '—'}</p>
              </div>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '4px' }}>WEEKLY AVAILABILITY</p>
                <p style={{ color: '#e2e8f0' }}>{profile?.availability || '—'}</p>
              </div>
            </div>
          </div>

          <div className="dash-stat-card" style={{ flex: '1', minWidth: '280px', padding: '24px' }}>
            <h2 style={{ color: '#e2e8f0', marginBottom: '20px', fontSize: '1rem', letterSpacing: '0.05em' }}>ENROLLED COURSES</h2>
            {courses.length === 0 ? (
              <p style={{ color: '#64748b' }}>No courses added yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {courses.map(course => (
                  <div key={course.id} style={{ background: '#1a2744', borderRadius: '8px', padding: '12px 16px', border: '1px solid #2d4a8a' }}>
                    <p style={{ color: '#6ea8fe', fontWeight: 600, fontSize: '0.85rem' }}>{course.code}</p>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '2px' }}>{course.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        <button
          onClick={() => navigate('/dashboard')}
          style={{ marginTop: '32px', background: 'transparent', border: '1px solid #2d4a8a', color: '#6ea8fe', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer' }}
        >
          ← Back to Dashboard
        </button>
      </main>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../apiUrl';
import './DashboardPage.css';

export default function CollabGroupChatPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    if (!token || !postId) return undefined;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setPayload(null);
      try {
        const res = await axios.get(apiUrl(`/api/collab/posts/${postId}/group-chat`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        const link = (res.data?.post?.chat_link || '').trim();
        if (link) {
          window.location.assign(link);
          return;
        }
        setPayload(res.data);
      } catch (err) {
        if (cancelled) return;
        setError(err?.response?.data?.message || 'Could not open group chat.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, postId]);

  return (
    <div className="dash-root">
      <div className="dash-ambient-1" />
      <div className="dash-ambient-2" />
      <main className="dash-main" style={{ maxWidth: 520, margin: '0 auto', paddingTop: 32 }}>
        <button
          type="button"
          className="dash-filter-btn"
          style={{ marginBottom: 20 }}
          onClick={() => navigate('/collaborate')}
        >
          ← Back to Collaborate
        </button>

        {loading && (
          <p className="dash-members" style={{ fontSize: 14, color: '#e2e4ed' }}>
            Opening group chat…
          </p>
        )}

        {!loading && error && (
          <div className="dash-card" style={{ padding: 20 }}>
            <p style={{ color: '#ff8f8f', marginBottom: 12 }}>{error}</p>
            <p className="dash-members" style={{ fontSize: 13 }}>
              If you are not in this group yet, join the post from the Collaborate page first.
            </p>
          </div>
        )}

        {!loading && !error && payload && (
          <div className="dash-card" style={{ padding: 20 }}>
            <p className="dash-course-badge" style={{ marginBottom: 6 }}>{payload.post?.course_code}</p>
            <h1 className="dash-name" style={{ fontSize: 22, marginBottom: 12 }}>{payload.post?.title}</h1>
            {!payload.post?.group_formed && (
              <p className="dash-members" style={{ fontSize: 13, marginBottom: 16 }}>
                This group is not full yet. Chat opens once the group is formed and someone adds a chat link.
              </p>
            )}
            {payload.post?.group_formed && !payload.post?.chat_link && (
              <p className="dash-members" style={{ fontSize: 13, marginBottom: 16 }}>
                No chat link has been added yet. Ask the post author to use &quot;Set Group Chat Link&quot; (e.g. Google Chat space) so everyone can meet in one place.
              </p>
            )}
            <h2 className="dash-modal-label" style={{ marginTop: 8, marginBottom: 10 }}>Members</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {(payload.members || []).map((m) => (
                <li
                  key={m.user_id}
                  className="dash-members"
                  style={{ fontSize: 14, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <strong style={{ color: '#e2e4ed' }}>{m.full_name || 'Member'}</strong>
                  <span style={{ color: 'rgba(226,228,237,0.35)', marginLeft: 8 }}>{m.email}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

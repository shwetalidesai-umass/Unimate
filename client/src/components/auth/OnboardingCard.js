import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../apiUrl';

const stepConfig = {
  1: {
    tag: 'STEP 1 OF 2',
    title: 'Tell us about',
    highlight: 'you',
    description: "We'll use this to personalise your experience across the Five Colleges.",
  },
  2: {
    tag: 'STEP 2 OF 2',
    title: 'Your',
    highlight: 'courses',
    description: "Select the courses you're taking — we'll help you find study partners and resources.",
  }
};

function OnboardingCard({ step, onNext, onBack }) {
  const { user, token, login } = useAuth();
  const config = stepConfig[step];
  const isLastStep = step === 2;

  const [school, setSchool]                     = useState('');
  const [year, setYear]                         = useState('');
  const [major, setMajor]                       = useState('');
  const [selectedCourses, setSelectedCourses]   = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [availability, setAvailability]         = useState('');
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState('');

  const displayName = user?.full_name || user?.email || 'Student';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const email = user?.email || '';

  useEffect(() => {
    if (step === 2) {
      fetch(apiUrl('/api/dashboard/courses/all'), {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => setAvailableCourses(data.courses || []))
        .catch(console.error);
    }
  }, [step, token]);

  function toggleCourse(code) {
    setSelectedCourses(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const body = step === 1
        ? { step: 1, school, class_year: year, major }
        : { step: 2, courses: selectedCourses, availability };

      const res = await fetch(apiUrl('/api/auth/onboarding'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      if (isLastStep) {
        const refreshRes = await fetch(apiUrl('/api/auth/token/refresh'), {
          method: 'POST',
          credentials: 'include',
        });
        const refreshData = await refreshRes.json();
        if (refreshData.accessToken) login(refreshData.accessToken);
        window.location.replace('/dashboard');
      } else {
        onNext();
      }
    } catch (err) {
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="onboarding-card">
      <div className="user-summary">
        <div className="user-avatar">{initials}</div>
        <div>
          <h2>{displayName}</h2>
          <p>{email}</p>
        </div>
      </div>

      <div className="onboarding-header">
        <span className="onboarding-step-tag">{config.tag}</span>
        <h1>{config.title} <span>{config.highlight}</span></h1>
        <p>{config.description}</p>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '8px' }}>{error}</p>}

      <form className="onboarding-form" onSubmit={handleSubmit}>
        {step === 1 && (
          <>
            <div className="field-group">
              <label>School</label>
              <select aria-label="School" value={school} onChange={e => setSchool(e.target.value)} required>
                <option value="" disabled>Select your school</option>
                <option value="amherst">Amherst College</option>
                <option value="umass">UMass Amherst</option>
                <option value="smith">Smith College</option>
                <option value="mount_holyoke">Mount Holyoke</option>
                <option value="hampshire">Hampshire College</option>
              </select>
            </div>
            <div className="field-group">
              <label>Class Year</label>
              <input
                type="text"
                placeholder="e.g. 2027"
                value={year}
                onChange={e => setYear(e.target.value)}
                required
              />
            </div>
            <div className="field-group">
              <label>Concentration / Major</label>
              <input
                type="text"
                placeholder="e.g. Computer Science, Biology"
                value={major}
                onChange={e => setMajor(e.target.value)}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="field-group">
              <label>Select Your Courses</label>
              {availableCourses.length === 0 ? (
                <p style={{ color: '#64748b' }}>Loading courses...</p>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '240px',
                  overflowY: 'auto',
                  paddingRight: '4px'
                }}>
                  {availableCourses.map(course => (
                    <label key={course.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: selectedCourses.includes(course.code) ? '1px solid #2d4a8a' : '1px solid transparent',
                      background: selectedCourses.includes(course.code) ? '#1a2744' : 'transparent',
                      transition: 'all 0.15s ease'
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedCourses.includes(course.code)}
                        onChange={() => toggleCourse(course.code)}
                        style={{ flexShrink: 0, width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ color: '#6ea8fe', fontWeight: 600, fontSize: '0.85rem', minWidth: '100px', flexShrink: 0 }}>
                        {course.code}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                        {course.title}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="field-group">
              <label>Weekly Availability</label>
              <input
                type="text"
                placeholder="e.g. Weekdays, Evenings, Anytime"
                value={availability}
                onChange={e => setAvailability(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="button-row">
          {step > 1 && (
            <button type="button" className="secondary-button" onClick={onBack}>
              ← Back
            </button>
          )}
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Saving...' : isLastStep ? 'Finish' : 'Continue'}
          </button>
        </div>
      </form>
    </article>
  );
}

export default OnboardingCard;
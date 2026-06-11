import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';

import SignInPage from '../pages/SignInPage';
import OnboardingPage from '../pages/OnboardingPage';
import ReviewsPage from '../pages/ReviewsPage';
import DashboardPage from '../pages/DashboardPage';
import CollaboratePage from '../pages/CollaboratePage';
import DiscussionsPage from '../pages/DiscussionsPage';
import ProfilePage from '../pages/ProfilePage';

import { AuthProvider } from '../context/AuthContext';

expect.extend(toHaveNoViolations);

jest.mock('../apiUrl', () => ({
  apiUrl: (path) => path,
}));

jest.mock('../hooks/useDashboard', () => ({
  useDashboard: () => ({
    stats: { open_posts: 1, open_posts_delta: 1, active_discussions: 1, discussions_delta: 1, reviews_posted: 1 },
    posts: [{ id: 'p1', title: 'Need partner', tag: 'Project', member_count: 1, max_members: 2, is_member: false, course: 'COMPSCI 520' }],
    questions: [{ id: 'q1', course: 'COMPSCI 520', question: 'Q?', votes: 0, answer_count: 0 }],
    activity: [{ id: 'a1', type: 'post', text: 'New post', created_at: new Date().toISOString() }],
  }),
}));

jest.mock('../hooks/useReviews', () => ({
  useReviews: () => ({
    courses: [{ id: 'c1', code: 'COMPSCI 520', title: 'SE' }],
    professors: [{ id: 'p1', full_name: 'Heather Conboy' }],
    selectedCourse: null,
    setSelectedCourse: jest.fn(),
    selectedProfessor: null,
    setSelectedProfessor: jest.fn(),
    courseDetail: null,
    professorDetail: null,
    loading: false,
    submitting: false,
    submitMsg: null,
    submitCourseReview: jest.fn(async () => true),
    submitProfessorReview: jest.fn(async () => true),
  }),
}));

jest.mock('axios');

function renderPage(ui, { route = '/' } = {}) {
  localStorage.setItem('unimate_token', 'e30.eyJlbWFpbCI6InN0dWRlbnRAdW1hc3MuZWR1Iiwib25ib2FyZGluZ19kb25lIjp0cnVlfQ.s');
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ full_name: 'Student', email: 'student@umass.edu', school: 'umass', courses: [] }),
  }));
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('Usability (a11y smoke): pages have no obvious axe violations', () => {
  const axeConfig = { rules: { 'heading-order': { enabled: false } } };

  beforeEach(() => {
    const axios = require('axios');
    axios.get.mockImplementation((url) => {
      if (url && url.includes('/courses/all')) return Promise.resolve({ data: { courses: [] } });
      return Promise.resolve({ data: { posts: [], questions: [], answers: [] } });
    });
    axios.post.mockResolvedValue({ data: {} });
    axios.patch.mockResolvedValue({ data: {} });
  });

  test('SignInPage', async () => {
    const { container } = renderPage(<SignInPage />, { route: '/login' });
    const results = await axe(container, axeConfig);
    expect(results).toHaveNoViolations();
  });

  test('OnboardingPage', async () => {
    const { container } = renderPage(<OnboardingPage />, { route: '/onboarding' });
    const results = await axe(container, axeConfig);
    expect(results).toHaveNoViolations();
  });

  test('DashboardPage', async () => {
    const { container } = renderPage(<DashboardPage />, { route: '/dashboard' });
    const results = await axe(container, axeConfig);
    expect(results).toHaveNoViolations();
  });

  test('CollaboratePage', async () => {
    const { container } = renderPage(<CollaboratePage />, { route: '/collaborate' });
    const results = await axe(container, axeConfig);
    expect(results).toHaveNoViolations();
  });

  test('DiscussionsPage', async () => {
    const { container } = renderPage(<DiscussionsPage />, { route: '/discussions' });
    const results = await axe(container, axeConfig);
    expect(results).toHaveNoViolations();
  });

  test('ReviewsPage', async () => {
    const { container } = renderPage(<ReviewsPage />, { route: '/reviews' });
    const results = await axe(container, axeConfig);
    expect(results).toHaveNoViolations();
  });

  test('ProfilePage', async () => {
    const { container } = renderPage(<ProfilePage />, { route: '/profile' });
    const results = await axe(container, axeConfig);
    expect(results).toHaveNoViolations();
  });
});
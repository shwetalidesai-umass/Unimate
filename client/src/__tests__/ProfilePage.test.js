import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from '../pages/ProfilePage';

// Mock useAuth
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock apiUrl
jest.mock('../apiUrl', () => ({
  apiUrl: (path) => `http://localhost:4000${path}`,
}));

import { useAuth } from '../context/AuthContext';

const mockProfile = {
  full_name: 'Alex Student',
  email: 'student@umass.edu',
  school: 'umass',
  class_year: 2026,
  major: 'Computer Science',
  availability: 'Weekdays',
  courses: [
    { id: '1', code: 'COMPSCI 602', title: 'Research Methods' },
    { id: '2', code: 'COMPSCI 532', title: 'Systems for Data Science' },
  ],
};

beforeEach(() => {
  useAuth.mockReturnValue({
    user: { full_name: 'Alex Student' },
    token: 'fake-token',
    logout: jest.fn(),
  });

  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve(mockProfile),
    })
  );
});

afterEach(() => {
  jest.clearAllMocks();
});

function renderProfilePage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );
}

describe('ProfilePage', () => {
  it('renders Your Profile heading', async () => {
    renderProfilePage();
    expect(screen.getByText('Your Profile')).toBeInTheDocument();
  });

  it('renders full name after fetch', async () => {
    renderProfilePage();
    await waitFor(() => {
      expect(screen.getAllByText('Alex Student').length).toBeGreaterThan(0);
    });
  });

  it('renders email after fetch', async () => {
    renderProfilePage();
    await waitFor(() => {
      expect(screen.getByText('student@umass.edu')).toBeInTheDocument();
    });
  });

  it('renders school after fetch', async () => {
    renderProfilePage();
    await waitFor(() => {
      expect(screen.getAllByText('umass').length).toBeGreaterThan(0);
    });
  });

  it('renders class year after fetch', async () => {
    renderProfilePage();
    await waitFor(() => {
      expect(screen.getByText('2026')).toBeInTheDocument();
    });
  });

  it('renders major after fetch', async () => {
    renderProfilePage();
    await waitFor(() => {
      expect(screen.getByText('Computer Science')).toBeInTheDocument();
    });
  });

  it('renders availability after fetch', async () => {
    renderProfilePage();
    await waitFor(() => {
      expect(screen.getByText('Weekdays')).toBeInTheDocument();
    });
  });

  it('renders enrolled courses', async () => {
    renderProfilePage();
    await waitFor(() => {
      expect(screen.getByText('COMPSCI 602')).toBeInTheDocument();
      expect(screen.getByText('COMPSCI 532')).toBeInTheDocument();
    });
  });

  it('renders course titles', async () => {
    renderProfilePage();
    await waitFor(() => {
      expect(screen.getByText('Research Methods')).toBeInTheDocument();
      expect(screen.getByText('Systems for Data Science')).toBeInTheDocument();
    });
  });

  it('shows no courses message when courses is empty', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ ...mockProfile, courses: [] }),
      })
    );

    renderProfilePage();
    await waitFor(() => {
      expect(screen.getByText('No courses added yet')).toBeInTheDocument();
    });
  });

  it('shows dashes when profile fields are missing', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ courses: [] }),
      })
    );

    renderProfilePage();
    await waitFor(() => {
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  it('navigates to dashboard when back button is clicked', async () => {
    renderProfilePage();
    await waitFor(() => {
      expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('← Back to Dashboard'));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('calls fetch with correct auth header', async () => {
    renderProfilePage();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer fake-token',
          }),
        })
      );
    });
  });

  it('does not fetch when token is missing', () => {
    useAuth.mockReturnValue({
      user: null,
      token: null,
      logout: jest.fn(),
    });

    renderProfilePage();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
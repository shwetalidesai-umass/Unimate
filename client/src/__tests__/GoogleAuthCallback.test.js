import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import GoogleAuthCallback from '../pages/GoogleAuthCallback';
import axios from 'axios';

jest.mock('axios');

beforeEach(() => {
  delete window.location;
  window.location = {
    hash: '',
    search: '',
    assign: jest.fn(),
  };
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('GoogleAuthCallback', () => {
  it('renders signing in message', () => {
    render(<GoogleAuthCallback />);
    expect(screen.getByText('Signing you in with Google...')).toBeInTheDocument();
  });

  it('redirects to login when oauth error in search params', async () => {
    window.location.search = '?error=access_denied';
    render(<GoogleAuthCallback />);
    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith(
        expect.stringContaining('/login?error=auth_failed')
      );
    });
  });

  it('redirects to login when oauth error in hash', async () => {
    window.location.hash = '#error=access_denied';
    render(<GoogleAuthCallback />);
    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith(
        expect.stringContaining('/login?error=auth_failed')
      );
    });
  });

  it('redirects to login when id_token is missing', async () => {
    window.location.search = '';
    window.location.hash = '';
    render(<GoogleAuthCallback />);
    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith(
        '/login?error=auth_failed&reason=missing_id_token'
      );
    });
  });

  it('redirects to login on state mismatch', async () => {
    window.location.search = '?id_token=fake-token&state=wrong-state';
    localStorage.setItem('google_oauth_state', 'correct-state');
    render(<GoogleAuthCallback />);
    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith(
        '/login?error=auth_failed&reason=state_mismatch'
      );
    });
  });

  it('redirects to dashboard on successful auth', async () => {
    window.location.search = '?id_token=fake-token';
    axios.post.mockResolvedValue({ data: { token: 'jwt-token' } });
    render(<GoogleAuthCallback />);
    await waitFor(() => {
      expect(localStorage.getItem('unimate_token')).toBe('jwt-token');
      expect(window.location.assign).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('redirects to login when backend returns no token', async () => {
    window.location.search = '?id_token=fake-token';
    axios.post.mockResolvedValue({ data: {} });
    render(<GoogleAuthCallback />);
    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith('/login?error=auth_failed');
    });
  });

  it('redirects to unauthorized_domain when backend rejects domain', async () => {
    window.location.search = '?id_token=fake-token';
    axios.post.mockRejectedValue({
      response: { data: { message: 'unauthorized_domain' } },
    });
    render(<GoogleAuthCallback />);
    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith('/login?error=unauthorized_domain');
    });
  });

  it('redirects to auth_failed on general backend error', async () => {
    window.location.search = '?id_token=fake-token';
    axios.post.mockRejectedValue(new Error('Network error'));
    render(<GoogleAuthCallback />);
    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith(
        '/login?error=auth_failed&reason=backend_reject'
      );
    });
  });

  it('proceeds without state check when no expected state in storage', async () => {
    window.location.search = '?id_token=fake-token&state=any-state';
    axios.post.mockResolvedValue({ data: { token: 'jwt-token' } });
    render(<GoogleAuthCallback />);
    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith('/dashboard');
    });
  });
});
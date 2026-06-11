import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignInPage from '../pages/SignInPage';

// Mock AuthCard
jest.mock('../components/auth/AuthCard', () => () => <div data-testid="auth-card">AuthCard</div>);

// Helper to set window.location.search
function setSearch(params) {
  delete window.location;
  window.location = { search: params ? `?${params}` : '' };
}

afterEach(() => {
  delete window.location;
  window.location = { search: '' };
  jest.clearAllMocks();
});

describe('SignInPage', () => {
  describe('rendering', () => {
    it('renders AuthCard', () => {
      setSearch('');
      render(<SignInPage />);
      expect(screen.getByTestId('auth-card')).toBeInTheDocument();
    });

    it('renders no error by default', () => {
      setSearch('');
      render(<SignInPage />);
      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('shows unauthorized_domain error', async () => {
      setSearch('error=unauthorized_domain');
      render(<SignInPage />);
      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.getByText(/not from a Five College institution/)).toBeInTheDocument();
      });
    });

    it('shows server_error without reason', async () => {
      setSearch('error=server_error');
      render(<SignInPage />);
      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.getByText(/Sign-in failed on the server/)).toBeInTheDocument();
      });
    });

    it('shows server_error with reason', async () => {
      setSearch('error=server_error&reason=Database%20connection%20failed');
      render(<SignInPage />);
      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.getByText(/Database connection failed/)).toBeInTheDocument();
      });
    });

    it('shows google_oauth_not_configured error', async () => {
      setSearch('error=google_oauth_not_configured');
      render(<SignInPage />);
      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.getByText(/Google OAuth credentials/)).toBeInTheDocument();
      });
    });

    it('dismisses error when Dismiss button clicked', async () => {
      setSearch('error=unauthorized_domain');
      render(<SignInPage />);
      await waitFor(() => screen.getByText('Dismiss'));
      await userEvent.click(screen.getByText('Dismiss'));
      await waitFor(() => {
        expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
      });
    });

    it('shows no error for unknown error param', async () => {
      setSearch('error=unknown_error');
      render(<SignInPage />);
      await waitFor(() => {
        expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
      });
    });
  });
});
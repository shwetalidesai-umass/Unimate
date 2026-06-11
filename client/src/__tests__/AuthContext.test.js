import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth, decodeJwtPayload } from '../context/AuthContext';

// Helper to create a fake JWT token
function makeFakeToken(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${body}.fakesignature`;
}

// Test component that reads from AuthContext
function TestComponent() {
  const { token, user, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="token">{token || 'no-token'}</p>
      <p data-testid="user">{user?.full_name || user?.email || 'no-user'}</p>
      <button onClick={() => login(makeFakeToken({
        id: '123',
        email: 'test@umass.edu',
        full_name: 'Test User',
        onboarding_done: true,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }))}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({}) })
  );
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('AuthContext', () => {
  describe('decodeJwtPayload', () => {
    it('correctly decodes a valid JWT payload', () => {
      const token = makeFakeToken({ email: 'test@umass.edu', full_name: 'Test User' });
      const payload = decodeJwtPayload(token);
      expect(payload.email).toBe('test@umass.edu');
      expect(payload.full_name).toBe('Test User');
    });

    it('throws on invalid JWT format', () => {
      expect(() => decodeJwtPayload('invalid')).toThrow('Invalid JWT format');
    });

    it('throws on empty token', () => {
      expect(() => decodeJwtPayload('')).toThrow('Invalid JWT format');
    });
  });

  describe('login', () => {
    it('stores token in localStorage', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login').click();
      });

      expect(localStorage.getItem('unimate_token')).not.toBeNull();
    });

    it('sets user from decoded JWT', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login').click();
      });

      expect(screen.getByTestId('user').textContent).toBe('Test User');
    });

    it('sets token state', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login').click();
      });

      expect(screen.getByTestId('token').textContent).not.toBe('no-token');
    });

    it('uses name as fallback when full_name is missing', async () => {
      function LoginWithName() {
        const { login, user } = useAuth();
        return (
          <div>
            <p data-testid="user">{user?.full_name || 'no-user'}</p>
            <button onClick={() => login(makeFakeToken({
              id: '123',
              email: 'test@umass.edu',
              name: 'Fallback Name',
              exp: Math.floor(Date.now() / 1000) + 3600,
            }))}>Login</button>
          </div>
        );
      }

      render(
        <AuthProvider>
          <LoginWithName />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login').click();
      });

      expect(screen.getByTestId('user').textContent).toBe('Fallback Name');
    });
  });

  describe('logout', () => {
    it('clears token from localStorage', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login').click();
      });

      await act(async () => {
        screen.getByText('Logout').click();
      });

      expect(localStorage.getItem('unimate_token')).toBeNull();
    });

    it('clears user state', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login').click();
      });

      await act(async () => {
        screen.getByText('Logout').click();
      });

      expect(screen.getByTestId('user').textContent).toBe('no-user');
    });

    it('calls logout API endpoint', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login').click();
      });

      await act(async () => {
        screen.getByText('Logout').click();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/logout'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });


  describe('initial state', () => {
    it('reads token from localStorage on mount', () => {
      const token = makeFakeToken({
        id: '123',
        email: 'test@umass.edu',
        full_name: 'Stored User',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      localStorage.setItem('unimate_token', token);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('user').textContent).toBe('Stored User');
    });

    it('starts with no user when localStorage is empty', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('token').textContent).toBe('no-token');
      expect(screen.getByTestId('user').textContent).toBe('no-user');
    });
  });
});
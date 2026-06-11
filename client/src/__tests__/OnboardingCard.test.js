import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OnboardingCard from '../components/auth/OnboardingCard';
import { AuthProvider } from '../context/AuthContext';

/** Minimal JWT body AuthContext can decode (base64url, no pad) */
function makeTestToken(payload) {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, 'utf8').toString('base64');
  const body = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `e.${body}.s`;
}

function renderWithAuth(ui) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

describe('OnboardingCard', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'unimate_token',
      makeTestToken({
        exp: Math.floor(Date.now() / 1000) + 3600,
        email: 'student@umass.edu',
        full_name: 'Test Student',
      }),
    );
    global.fetch = jest.fn((url) => {
      if (String(url).includes('/api/dashboard/courses/all')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ courses: [{ id: 1, code: 'CS 520', title: 'Algorithms' }] }),
        });
      }
      if (String(url).includes('/api/auth/onboarding')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true }),
        });
      }
      if (String(url).includes('/api/auth/token/refresh')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test('renders step 1 with school dropdown', () => {
    renderWithAuth(<OnboardingCard step={1} onNext={jest.fn()} onBack={jest.fn()} />);
    expect(screen.getByText('STEP 1 OF 2')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  test('renders step 2 with course list after load', async () => {
    renderWithAuth(<OnboardingCard step={2} onNext={jest.fn()} onBack={jest.fn()} />);
    expect(screen.getByText('STEP 2 OF 2')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('CS 520')).toBeInTheDocument();
    });
  });

  test('shows Continue on step 1', () => {
    renderWithAuth(<OnboardingCard step={1} onNext={jest.fn()} onBack={jest.fn()} />);
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  test('shows Finish on step 2', () => {
    renderWithAuth(<OnboardingCard step={2} onNext={jest.fn()} onBack={jest.fn()} />);
    expect(screen.getByText('Finish')).toBeInTheDocument();
  });

  test('calls onNext after successful step 1 submit', async () => {
    const onNext = jest.fn();
    renderWithAuth(<OnboardingCard step={1} onNext={onNext} onBack={jest.fn()} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'umass' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 2027'), { target: { value: '2027' } });
    fireEvent.submit(document.querySelector('form'));

    await waitFor(() => {
      expect(onNext).toHaveBeenCalled();
    });
  });

  test('shows Back button on step 2', () => {
    renderWithAuth(<OnboardingCard step={2} onNext={jest.fn()} onBack={jest.fn()} />);
    expect(screen.getByText('← Back')).toBeInTheDocument();
  });

  test('does not show Back button on step 1', () => {
    renderWithAuth(<OnboardingCard step={1} onNext={jest.fn()} onBack={jest.fn()} />);
    expect(screen.queryByText('← Back')).not.toBeInTheDocument();
  });
});

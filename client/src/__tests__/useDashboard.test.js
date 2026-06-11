import { renderHook, waitFor, act } from '@testing-library/react';
import { useDashboard } from '../hooks/useDashboard';

// Mock useAuth
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock apiUrl
jest.mock('../apiUrl', () => ({
  apiUrl: (path) => `http://localhost:4000${path}`,
}));

import { useAuth } from '../context/AuthContext';

const mockStats = {
  open_posts: 5,
  open_posts_delta: 2,
  active_discussions: 10,
  discussions_delta: 3,
  reviews_posted: 42,
};

const mockPosts = [
  { id: 'p1', title: 'Study group', course: 'COMPSCI 602', tag: 'Study', member_count: 2, max_members: 4 },
  { id: 'p2', title: 'Project partner', course: 'COMPSCI 532', tag: 'Project', member_count: 1, max_members: 3 },
];

const mockQuestions = [
  { id: 'q1', question: 'How to prep?', course: 'COMPSCI 602', votes: 5, answer_count: 2 },
];

const mockActivity = [
  { id: 'a1', type: 'post', text: 'New post in COMPSCI 602' },
];

beforeEach(() => {
  useAuth.mockReturnValue({ token: 'fake-token' });

  global.fetch = jest.fn((url) => {
    if (url.includes('/stats')) {
      return Promise.resolve({ json: () => Promise.resolve(mockStats) });
    }
    if (url.includes('/activity')) {
      return Promise.resolve({ json: () => Promise.resolve(mockActivity) });
    }
    if (url.includes('/collab-posts')) {
      return Promise.resolve({ json: () => Promise.resolve(mockPosts) });
    }
    if (url.includes('/questions')) {
      return Promise.resolve({ json: () => Promise.resolve(mockQuestions) });
    }
    return Promise.resolve({ json: () => Promise.resolve({}) });
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useDashboard', () => {
  it('returns initial empty state', () => {
    const { result } = renderHook(() =>
      useDashboard({ tagFilter: 'All', search: '' })
    );
    expect(result.current.stats).toBeNull();
    expect(result.current.posts).toEqual([]);
    expect(result.current.questions).toEqual([]);
    expect(result.current.activity).toEqual([]);
  });

  it('fetches stats on mount', async () => {
    const { result } = renderHook(() =>
      useDashboard({ tagFilter: 'All', search: '' })
    );
    await waitFor(() => {
      expect(result.current.stats).toEqual(mockStats);
    });
  });

  it('fetches activity on mount', async () => {
    const { result } = renderHook(() =>
      useDashboard({ tagFilter: 'All', search: '' })
    );
    await waitFor(() => {
      expect(result.current.activity).toEqual(mockActivity);
    });
  });

  it('fetches posts on mount', async () => {
    const { result } = renderHook(() =>
      useDashboard({ tagFilter: 'All', search: '' })
    );
    await waitFor(() => {
      expect(result.current.posts).toEqual(mockPosts);
    });
  });

  it('fetches questions on mount', async () => {
    const { result } = renderHook(() =>
      useDashboard({ tagFilter: 'All', search: '' })
    );
    await waitFor(() => {
      expect(result.current.questions).toEqual(mockQuestions);
    });
  });

  it('does not fetch when token is null', () => {
    useAuth.mockReturnValue({ token: null });
    renderHook(() => useDashboard({ tagFilter: 'All', search: '' }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('includes tag filter in collab posts request', async () => {
    renderHook(() => useDashboard({ tagFilter: 'Study', search: '' }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('tag=Study'),
        expect.any(Object)
      );
    });
  });

  it('does not include tag param when All is selected', async () => {
    renderHook(() => useDashboard({ tagFilter: 'All', search: '' }));
    await waitFor(() => {
      const calls = global.fetch.mock.calls.map(c => c[0]);
      const collabCall = calls.find(url => url.includes('/collab-posts'));
      expect(collabCall).not.toContain('tag=');
    });
  });

  it('includes search in collab posts request', async () => {
    renderHook(() => useDashboard({ tagFilter: 'All', search: 'algorithms' }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=algorithms'),
        expect.any(Object)
      );
    });
  });

  it('sends auth header with requests', async () => {
    renderHook(() => useDashboard({ tagFilter: 'All', search: '' }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer fake-token',
          }),
        })
      );
    });
  });

  it('refetches posts when tagFilter changes', async () => {
    const { rerender } = renderHook(
      ({ tagFilter }) => useDashboard({ tagFilter, search: '' }),
      { initialProps: { tagFilter: 'All' } }
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const callsBefore = global.fetch.mock.calls.length;

    rerender({ tagFilter: 'Study' });

    await waitFor(() => {
      expect(global.fetch.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('refetches posts when search changes', async () => {
    const { rerender } = renderHook(
      ({ search }) => useDashboard({ tagFilter: 'All', search }),
      { initialProps: { search: '' } }
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const callsBefore = global.fetch.mock.calls.length;

    rerender({ search: 'algorithms' });

    await waitFor(() => {
      expect(global.fetch.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
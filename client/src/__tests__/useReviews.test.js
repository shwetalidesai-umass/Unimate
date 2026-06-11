import { renderHook, waitFor, act } from '@testing-library/react';
import { useReviews } from '../hooks/useReviews';

// Mock useAuth
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock apiUrl
jest.mock('../apiUrl', () => ({
  apiUrl: (path) => `http://localhost:4000${path}`,
}));

import { useAuth } from '../context/AuthContext';

const mockCourses = [
  { id: '1', code: 'COMPSCI 602', title: 'Research Methods' },
  { id: '2', code: 'COMPSCI 532', title: 'Systems for Data Science' },
];

const mockProfessors = [
  { id: '1', full_name: 'Heather Conboy' },
  { id: '2', full_name: 'Erik Learned-Miller' },
];

const mockCourseDetail = {
  id: '1',
  code: 'COMPSCI 602',
  reviews: [
    { id: 'r1', rating: 5, body: 'Great course!', created_at: '2026-04-01', reviewer_name: 'Student A' },
  ],
  review_count: 1,
  avg_rating: 5,
};

const mockProfessorDetail = {
  id: '1',
  full_name: 'Heather Conboy',
  reviews: [
    { id: 'r2', rating: 4, body: 'Great professor!', created_at: '2026-04-01', reviewer_name: 'Student B' },
  ],
  review_count: 1,
  avg_rating: 4,
};

beforeEach(() => {
  useAuth.mockReturnValue({ token: 'fake-token' });

  global.fetch = jest.fn((url) => {
    if (url.includes('/api/reviews/courses/1')) {
      return Promise.resolve({ json: () => Promise.resolve(mockCourseDetail) });
    }
    if (url.includes('/api/reviews/courses')) {
      return Promise.resolve({ json: () => Promise.resolve(mockCourses) });
    }
    if (url.includes('/api/reviews/professors/1')) {
      return Promise.resolve({ json: () => Promise.resolve(mockProfessorDetail) });
    }
    if (url.includes('/api/reviews/professors')) {
      return Promise.resolve({ json: () => Promise.resolve(mockProfessors) });
    }
    return Promise.resolve({ json: () => Promise.resolve({}) });
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useReviews', () => {
  describe('initial load', () => {
    it('fetches courses on mount', async () => {
      const { result } = renderHook(() => useReviews());
      await waitFor(() => {
        expect(result.current.courses).toEqual(mockCourses);
      });
    });

    it('fetches professors on mount', async () => {
      const { result } = renderHook(() => useReviews());
      await waitFor(() => {
        expect(result.current.professors).toEqual(mockProfessors);
      });
    });

    it('does not fetch when token is null', () => {
      useAuth.mockReturnValue({ token: null });
      renderHook(() => useReviews());
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('starts with null courseDetail and professorDetail', () => {
      const { result } = renderHook(() => useReviews());
      expect(result.current.courseDetail).toBeNull();
      expect(result.current.professorDetail).toBeNull();
    });

    it('starts with loading false', () => {
      const { result } = renderHook(() => useReviews());
      expect(result.current.loading).toBe(false);
    });
  });

  describe('course selection', () => {
    it('fetches course detail when course selected', async () => {
      const { result } = renderHook(() => useReviews());

      act(() => {
        result.current.setSelectedCourse('1');
      });

      await waitFor(() => {
        expect(result.current.courseDetail).toEqual(mockCourseDetail);
      });
    });

    it('sets loading true while fetching course detail', async () => {
      const { result } = renderHook(() => useReviews());

      act(() => {
        result.current.setSelectedCourse('1');
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('clears courseDetail when selection cleared', async () => {
      const { result } = renderHook(() => useReviews());

      act(() => {
        result.current.setSelectedCourse('1');
      });

      await waitFor(() => expect(result.current.courseDetail).not.toBeNull());

      act(() => {
        result.current.setSelectedCourse(null);
      });

      await waitFor(() => {
        expect(result.current.courseDetail).toBeNull();
      });
    });
  });

  describe('professor selection', () => {
    it('fetches professor detail when professor selected', async () => {
      const { result } = renderHook(() => useReviews());

      act(() => {
        result.current.setSelectedProfessor('1');
      });

      await waitFor(() => {
        expect(result.current.professorDetail).toEqual(mockProfessorDetail);
      });
    });

    it('clears professorDetail when selection cleared', async () => {
      const { result } = renderHook(() => useReviews());

      act(() => {
        result.current.setSelectedProfessor('1');
      });

      await waitFor(() => expect(result.current.professorDetail).not.toBeNull());

      act(() => {
        result.current.setSelectedProfessor(null);
      });

      await waitFor(() => {
        expect(result.current.professorDetail).toBeNull();
      });
    });
  });

  describe('submitCourseReview', () => {
    it('returns true on successful submission', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockCourses) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockProfessors) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ id: 'r1', rating: 5 }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockCourseDetail) });

      const { result } = renderHook(() => useReviews());
      await waitFor(() => expect(result.current.courses).toEqual(mockCourses));

      let success;
      await act(async () => {
        success = await result.current.submitCourseReview('1', 5, 'Great course!');
      });

      expect(success).toBe(true);
    });

    it('sets success submitMsg on success', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockCourses) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockProfessors) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ id: 'r1', rating: 5 }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockCourseDetail) });

      const { result } = renderHook(() => useReviews());
      await waitFor(() => expect(result.current.courses).toEqual(mockCourses));

      await act(async () => {
        await result.current.submitCourseReview('1', 5, 'Great course!');
      });

      expect(result.current.submitMsg).toEqual({
        type: 'success',
        text: 'Review submitted successfully!',
      });
    });

    it('returns false and sets error submitMsg when API returns error', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockCourses) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockProfessors) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ error: 'You have already reviewed this course' }) });

      const { result } = renderHook(() => useReviews());
      await waitFor(() => expect(result.current.courses).toEqual(mockCourses));

      let success;
      await act(async () => {
        success = await result.current.submitCourseReview('1', 5, 'Great!');
      });

      expect(success).toBe(false);
      expect(result.current.submitMsg).toEqual({
        type: 'error',
        text: 'You have already reviewed this course',
      });
    });

    it('returns false and sets error on network failure', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockCourses) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockProfessors) })
        .mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useReviews());
      await waitFor(() => expect(result.current.courses).toEqual(mockCourses));

      let success;
      await act(async () => {
        success = await result.current.submitCourseReview('1', 5, 'Great!');
      });

      expect(success).toBe(false);
      expect(result.current.submitMsg?.type).toBe('error');
    });

    it('sets submitting true while submitting', async () => {
      let resolveFetch;
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockCourses) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockProfessors) })
        .mockImplementationOnce(() => new Promise(resolve => { resolveFetch = resolve; }));

      const { result } = renderHook(() => useReviews());
      await waitFor(() => expect(result.current.courses).toEqual(mockCourses));

      act(() => {
        result.current.submitCourseReview('1', 5, 'Great!');
      });

      await waitFor(() => {
        expect(result.current.submitting).toBe(true);
      });

      resolveFetch({ json: () => Promise.resolve({ id: 'r1' }) });
    });
  });

  describe('submitProfessorReview', () => {
    it('returns true on successful submission', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockCourses) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockProfessors) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ id: 'r2', rating: 4 }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockProfessorDetail) });

      const { result } = renderHook(() => useReviews());
      await waitFor(() => expect(result.current.professors).toEqual(mockProfessors));

      let success;
      await act(async () => {
        success = await result.current.submitProfessorReview('1', 4, 'Great professor!');
      });

      expect(success).toBe(true);
    });

    it('sets success submitMsg on success', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockCourses) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockProfessors) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ id: 'r2', rating: 4 }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockProfessorDetail) });

      const { result } = renderHook(() => useReviews());
      await waitFor(() => expect(result.current.professors).toEqual(mockProfessors));

      await act(async () => {
        await result.current.submitProfessorReview('1', 4, 'Great professor!');
      });

      expect(result.current.submitMsg).toEqual({
        type: 'success',
        text: 'Review submitted successfully!',
      });
    });

    it('returns false when API returns error', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockCourses) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockProfessors) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ error: 'Already reviewed' }) });

      const { result } = renderHook(() => useReviews());
      await waitFor(() => expect(result.current.professors).toEqual(mockProfessors));

      let success;
      await act(async () => {
        success = await result.current.submitProfessorReview('1', 4, 'Great!');
      });

      expect(success).toBe(false);
    });
  });

  describe('submitMsg auto clear', () => {
    it('clears submitMsg after 4 seconds', async () => {
      jest.useFakeTimers();

      global.fetch = jest.fn()
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockCourses) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockProfessors) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ id: 'r1' }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockCourseDetail) });

      const { result } = renderHook(() => useReviews());
      await waitFor(() => expect(result.current.courses).toEqual(mockCourses));

      await act(async () => {
        await result.current.submitCourseReview('1', 5, 'Great!');
      });

      expect(result.current.submitMsg).not.toBeNull();

      act(() => {
        jest.advanceTimersByTime(4000);
      });

      await waitFor(() => {
        expect(result.current.submitMsg).toBeNull();
      });

      jest.useRealTimers();
    });
  });
});
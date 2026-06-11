import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ReviewsPage from '../pages/ReviewsPage';

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

// Mock useReviews
jest.mock('../hooks/useReviews', () => ({
  useReviews: jest.fn(),
}));

import { useAuth } from '../context/AuthContext';
import { useReviews } from '../hooks/useReviews';

const mockCourses = [
  { id: '1', code: 'COMPSCI 602', title: 'Research Methods' },
  { id: '2', code: 'COMPSCI 532', title: 'Systems for Data Science' },
];

const mockProfessors = [
  { id: '1', full_name: 'Heather Conboy' },
  { id: '2', full_name: 'Erik Learned-Miller' },
];

const mockReviews = {
  courses: [],
  professors: [],
  selectedCourse: null,
  setSelectedCourse: jest.fn(),
  selectedProfessor: null,
  setSelectedProfessor: jest.fn(),
  courseDetail: null,
  professorDetail: null,
  loading: false,
  submitting: false,
  submitMsg: null,
  submitCourseReview: jest.fn(),
  submitProfessorReview: jest.fn(),
};

beforeEach(() => {
  useAuth.mockReturnValue({
    logout: jest.fn(),
  });
  useReviews.mockReturnValue({
    ...mockReviews,
    courses: mockCourses,
    professors: mockProfessors,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

function renderReviewsPage() {
  return render(
    <MemoryRouter>
      <ReviewsPage />
    </MemoryRouter>
  );
}

describe('ReviewsPage', () => {
  describe('rendering', () => {
    it('renders Reviews heading', () => {
      renderReviewsPage();
      expect(screen.getByText('Reviews')).toBeInTheDocument();
    });

    it('renders Courses and Professors tabs', () => {
      renderReviewsPage();
    
      expect(screen.getAllByText('Courses').length).toBeGreaterThan(0);
      expect(screen.getByText('Professors')).toBeInTheDocument();
    });

    it('renders course dropdown with courses', () => {
      renderReviewsPage();
      expect(screen.getByText('COMPSCI 602 — Research Methods')).toBeInTheDocument();
      expect(screen.getByText('COMPSCI 532 — Systems for Data Science')).toBeInTheDocument();
    });

    it('renders Write a Review form', () => {
      renderReviewsPage();
      expect(screen.getByText('Write a Review')).toBeInTheDocument();
    });

    it('renders submit button disabled when nothing selected', () => {
      renderReviewsPage();
      expect(screen.getByText('Submit Review')).toBeDisabled();
    });
  });

  describe('tab switching', () => {
    it('switches to professors tab and shows professor dropdown', async () => {
      renderReviewsPage();
      await userEvent.click(screen.getByText('Professors'));
      expect(screen.getByText('Heather Conboy')).toBeInTheDocument();
      expect(screen.getByText('Erik Learned-Miller')).toBeInTheDocument();
    });

    it('resets rating and review text when switching tabs', async () => {
      renderReviewsPage();
      await userEvent.click(screen.getByText('Professors'));
      expect(mockReviews.setSelectedCourse).toHaveBeenCalledWith(null);
      expect(mockReviews.setSelectedProfessor).toHaveBeenCalledWith(null);
    });

    it('shows course placeholder when on courses tab', () => {
      renderReviewsPage();
      expect(screen.getByText('— Choose a course —')).toBeInTheDocument();
    });

    it('shows professor placeholder when on professors tab', async () => {
      renderReviewsPage();
      await userEvent.click(screen.getByText('Professors'));
      expect(screen.getByText('— Choose a professor —')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading message when loading is true', () => {
      useReviews.mockReturnValue({
        ...mockReviews,
        courses: mockCourses,
        professors: mockProfessors,
        loading: true,
      });
      renderReviewsPage();
      expect(screen.getByText('Loading reviews…')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows select course message when no course selected', () => {
      renderReviewsPage();
      expect(screen.getByText('Select a course from the form to see reviews')).toBeInTheDocument();
    });

    it('shows no reviews message when course selected but no reviews', () => {
      useReviews.mockReturnValue({
        ...mockReviews,
        courses: mockCourses,
        professors: mockProfessors,
        selectedCourse: '1',
        courseDetail: { id: '1', code: 'COMPSCI 602', reviews: [], review_count: 0, avg_rating: null },
      });
      renderReviewsPage();
      expect(screen.getByText('No reviews yet — be the first to write one!')).toBeInTheDocument();
    });
  });

  describe('reviews display', () => {
    it('renders review cards when reviews exist', () => {
      useReviews.mockReturnValue({
        ...mockReviews,
        courses: mockCourses,
        professors: mockProfessors,
        selectedCourse: '1',
        courseDetail: {
          id: '1',
          code: 'COMPSCI 602',
          reviews: [
            { id: 'r1', rating: 5, body: 'Great course!', created_at: '2026-04-01', reviewer_name: 'Student A' },
          ],
          review_count: 1,
          avg_rating: 5,
        },
      });
      renderReviewsPage();
      expect(screen.getByText('Great course!')).toBeInTheDocument();
      expect(screen.getByText('Student A')).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('submit button disabled when no rating', () => {
      useReviews.mockReturnValue({
        ...mockReviews,
        courses: mockCourses,
        professors: mockProfessors,
        selectedCourse: '1',
      });
      renderReviewsPage();
      expect(screen.getByText('Submit Review')).toBeDisabled();
    });

    it('shows submitting text when submitting is true', () => {
      useReviews.mockReturnValue({
        ...mockReviews,
        courses: mockCourses,
        professors: mockProfessors,
        selectedCourse: '1',
        submitting: true,
        submitMsg: null,
      });
      renderReviewsPage();
      expect(screen.getByText('Submitting…')).toBeInTheDocument();
    });

    it('shows success message after successful submission', () => {
      useReviews.mockReturnValue({
        ...mockReviews,
        courses: mockCourses,
        professors: mockProfessors,
        selectedCourse: '1',
        submitMsg: { type: 'success', text: 'Review submitted successfully!' },
      });
      renderReviewsPage();
      expect(screen.getByText('Review submitted successfully!')).toBeInTheDocument();
    });

    it('shows error message on duplicate review', () => {
      useReviews.mockReturnValue({
        ...mockReviews,
        courses: mockCourses,
        professors: mockProfessors,
        selectedCourse: '1',
        submitMsg: { type: 'error', text: 'You have already reviewed this course' },
      });
      renderReviewsPage();
      expect(screen.getByText('You have already reviewed this course')).toBeInTheDocument();
    });
  });

  describe('mini stats', () => {
    it('shows dashes when no course selected', () => {
      renderReviewsPage();
      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });

    it('shows review count when course detail loaded', () => {
      useReviews.mockReturnValue({
        ...mockReviews,
        courses: mockCourses,
        professors: mockProfessors,
        selectedCourse: '1',
        courseDetail: {
          id: '1',
          code: 'COMPSCI 602',
          reviews: [],
          review_count: 5,
          avg_rating: 4.2,
        },
      });
      renderReviewsPage();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('4.2')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('navigates to dashboard when back button clicked', async () => {
      renderReviewsPage();
      await userEvent.click(screen.getByText('← Dashboard'));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('calls logout when sign out clicked', async () => {
      const mockLogout = jest.fn();
      useAuth.mockReturnValue({ logout: mockLogout });
      renderReviewsPage();
      await userEvent.click(screen.getByText('Sign out'));
      expect(mockLogout).toHaveBeenCalled();
    });
  });
});
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DiscussionsPage from '../pages/DiscussionsPage';
import axios from 'axios';

// Mock axios
jest.mock('axios');

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

const mockQuestions = [
  { id: 'q1', body: 'How do I study for the final?', course_code: 'COMPSCI 602', votes: 5 },
  { id: 'q2', body: 'What is the project format?', course_code: 'COMPSCI 532', votes: 3 },
];

const mockAnswers = [
  { id: 'a1', body: 'Start early and review slides.' },
  { id: 'a2', body: 'Check the syllabus.' },
];

beforeEach(() => {
  useAuth.mockReturnValue({
    token: 'fake-token',
    user: { full_name: 'Aryan Jaggi', email: 'ajaggi@umass.edu' },
    logout: jest.fn(),
  });

  axios.get.mockImplementation((url) => {
    if (url.includes('/courses/all')) return Promise.resolve({ data: { courses: [] } });
    if (url.includes('/answers')) return Promise.resolve({ data: { answers: mockAnswers } });
    return Promise.resolve({ data: { questions: mockQuestions } });
  });
  axios.post.mockResolvedValue({ data: {} });
});

afterEach(() => {
  jest.clearAllMocks();
});

function renderDiscussionsPage() {
  return render(
    <MemoryRouter>
      <DiscussionsPage />
    </MemoryRouter>
  );
}

describe('DiscussionsPage', () => {
  describe('rendering', () => {
    it('renders Discussions heading', async () => {
      renderDiscussionsPage();
      expect(screen.getAllByText('Discussions').length).toBeGreaterThan(0);
    });

    it('renders Start a New Question form', () => {
      renderDiscussionsPage();
      expect(screen.getByText('Start a New Question')).toBeInTheDocument();
    });

    it('renders course dropdown and question input', () => {
      renderDiscussionsPage();
      expect(screen.getByText('— Select a course —')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Your question')).toBeInTheDocument();
    });

    it('renders Post Question button', () => {
      renderDiscussionsPage();
      expect(screen.getByText('Post Question')).toBeInTheDocument();
    });
  });

  describe('loading questions', () => {
    it('loads and displays questions on mount', async () => {
      renderDiscussionsPage();
      await waitFor(() => {
        expect(screen.getByText('How do I study for the final?')).toBeInTheDocument();
        expect(screen.getByText('What is the project format?')).toBeInTheDocument();
      });
    });

    it('displays course badges', async () => {
      renderDiscussionsPage();
      await waitFor(() => {
        expect(screen.getByText('COMPSCI 602')).toBeInTheDocument();
        expect(screen.getByText('COMPSCI 532')).toBeInTheDocument();
      });
    });

    it('displays vote counts', async () => {
      renderDiscussionsPage();
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('shows no discussions message when empty', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/courses/all')) return Promise.resolve({ data: { courses: [] } });
        return Promise.resolve({ data: { questions: [] } });
      });
      renderDiscussionsPage();
      await waitFor(() => {
        expect(screen.getByText('No discussions yet')).toBeInTheDocument();
      });
    });

    it('shows error message when fetch fails', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));
      renderDiscussionsPage();
      await waitFor(() => {
        expect(screen.getByText('Could not load discussions.')).toBeInTheDocument();
      });
    });
  });

  describe('creating a question', () => {
    it('does not submit when course code is empty', async () => {
      renderDiscussionsPage();
      await userEvent.type(screen.getByPlaceholderText('Your question'), 'Test question');
      await userEvent.click(screen.getByText('Post Question'));
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('does not submit when body is empty', async () => {
      renderDiscussionsPage();
      await userEvent.click(screen.getByText('Post Question'));
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('submits question with correct data', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/courses/all')) return Promise.resolve({
          data: { courses: [{ id: '1', code: 'COMPSCI 602', title: 'Research Methods' }] }
        });
        return Promise.resolve({ data: { questions: mockQuestions } });
      });

      renderDiscussionsPage();
      await waitFor(() => screen.getByText('COMPSCI 602 — Research Methods'));
      await userEvent.selectOptions(screen.getByRole('combobox'), 'COMPSCI 602');
      await userEvent.type(screen.getByPlaceholderText('Your question'), 'Test question?');
      await userEvent.click(screen.getByText('Post Question'));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/api/discussions/questions'),
          { courseCode: 'COMPSCI 602', body: 'Test question?' },
          expect.any(Object)
        );
      });
    });

    it('clears form after successful submission', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/courses/all')) return Promise.resolve({
          data: { courses: [{ id: '1', code: 'COMPSCI 602', title: 'Research Methods' }] }
        });
        return Promise.resolve({ data: { questions: mockQuestions } });
      });

      renderDiscussionsPage();
      await waitFor(() => screen.getByText('COMPSCI 602 — Research Methods'));
      await userEvent.selectOptions(screen.getByRole('combobox'), 'COMPSCI 602');
      const bodyInput = screen.getByPlaceholderText('Your question');
      await userEvent.type(bodyInput, 'Test question?');
      await userEvent.click(screen.getByText('Post Question'));

      await waitFor(() => {
        expect(bodyInput.value).toBe('');
      });
    });

    it('shows error when question creation fails', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/courses/all')) return Promise.resolve({
          data: { courses: [{ id: '1', code: 'COMPSCI 602', title: 'Research Methods' }] }
        });
        return Promise.resolve({ data: { questions: mockQuestions } });
      });
      axios.post.mockRejectedValueOnce({
        response: { data: { message: 'Could not create question.' } }
      });

      renderDiscussionsPage();
      await waitFor(() => screen.getByText('COMPSCI 602 — Research Methods'));
      await userEvent.selectOptions(screen.getByRole('combobox'), 'COMPSCI 602');
      await userEvent.type(screen.getByPlaceholderText('Your question'), 'Test?');
      await userEvent.click(screen.getByText('Post Question'));

      await waitFor(() => {
        expect(screen.getByText('Could not create question.')).toBeInTheDocument();
      });
    });
  });

  describe('voting', () => {
    it('renders Upvote and Downvote buttons for each question', async () => {
      renderDiscussionsPage();
      await waitFor(() => {
        expect(screen.getAllByText('Upvote').length).toBe(2);
        expect(screen.getAllByText('Downvote').length).toBe(2);
      });
    });

    it('calls upvote endpoint when upvote clicked', async () => {
      renderDiscussionsPage();
      await waitFor(() => screen.getAllByText('Upvote'));
      await userEvent.click(screen.getAllByText('Upvote')[0]);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/vote'),
          { direction: 'up' },
          expect.any(Object)
        );
      });
    });

    it('calls downvote endpoint when downvote clicked', async () => {
      renderDiscussionsPage();
      await waitFor(() => screen.getAllByText('Downvote'));
      await userEvent.click(screen.getAllByText('Downvote')[0]);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/vote'),
          { direction: 'down' },
          expect.any(Object)
        );
      });
    });

    it('shows error when vote fails', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network error'));
      renderDiscussionsPage();
      await waitFor(() => screen.getAllByText('Upvote'));
      await userEvent.click(screen.getAllByText('Upvote')[0]);

      await waitFor(() => {
        expect(screen.getByText('Could not submit vote.')).toBeInTheDocument();
      });
    });
  });

  describe('answers', () => {
    it('renders View Answers button for each question', async () => {
      renderDiscussionsPage();
      await waitFor(() => {
        expect(screen.getAllByText('View Answers').length).toBe(2);
      });
    });

    it('fetches and shows answers when View Answers clicked', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/courses/all')) return Promise.resolve({ data: { courses: [] } });
        if (url.includes('/answers')) return Promise.resolve({ data: { answers: mockAnswers } });
        return Promise.resolve({ data: { questions: mockQuestions } });
      });

      renderDiscussionsPage();
      await waitFor(() => screen.getAllByText('View Answers'));
      await userEvent.click(screen.getAllByText('View Answers')[0]);

      await waitFor(() => {
        expect(screen.getByText('Start early and review slides.')).toBeInTheDocument();
        expect(screen.getByText('Check the syllabus.')).toBeInTheDocument();
      });
    });

    it('shows no answers message when answers is empty', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/courses/all')) return Promise.resolve({ data: { courses: [] } });
        if (url.includes('/answers')) return Promise.resolve({ data: { answers: [] } });
        return Promise.resolve({ data: { questions: mockQuestions } });
      });

      renderDiscussionsPage();
      await waitFor(() => screen.getAllByText('View Answers'));
      await userEvent.click(screen.getAllByText('View Answers')[0]);

      await waitFor(() => {
        expect(screen.getByText('No answers yet.')).toBeInTheDocument();
      });
    });

    it('toggles to Hide Answers when answers are shown', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/courses/all')) return Promise.resolve({ data: { courses: [] } });
        if (url.includes('/answers')) return Promise.resolve({ data: { answers: mockAnswers } });
        return Promise.resolve({ data: { questions: mockQuestions } });
      });

      renderDiscussionsPage();
      await waitFor(() => screen.getAllByText('View Answers'));
      await userEvent.click(screen.getAllByText('View Answers')[0]);

      await waitFor(() => {
        expect(screen.getByText('Hide Answers')).toBeInTheDocument();
      });
    });

    it('hides answers when Hide Answers clicked', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/courses/all')) return Promise.resolve({ data: { courses: [] } });
        if (url.includes('/answers')) return Promise.resolve({ data: { answers: mockAnswers } });
        return Promise.resolve({ data: { questions: mockQuestions } });
      });

      renderDiscussionsPage();
      await waitFor(() => screen.getAllByText('View Answers'));
      await userEvent.click(screen.getAllByText('View Answers')[0]);
      await waitFor(() => screen.getByText('Hide Answers'));
      await userEvent.click(screen.getByText('Hide Answers'));

      await waitFor(() => {
        expect(screen.queryByText('Start early and review slides.')).not.toBeInTheDocument();
      });
    });

    it('posts answer and refreshes answers list', async () => {
      let answersCallCount = 0;
      axios.get.mockImplementation((url) => {
        if (url.includes('/courses/all')) return Promise.resolve({ data: { courses: [] } });
        if (url.includes('/answers')) {
          answersCallCount++;
          if (answersCallCount === 1) return Promise.resolve({ data: { answers: [] } });
          return Promise.resolve({ data: { answers: [{ id: 'a3', body: 'My answer' }] } });
        }
        return Promise.resolve({ data: { questions: mockQuestions } });
      });

      renderDiscussionsPage();
      await waitFor(() => screen.getAllByText('View Answers'));
      await userEvent.click(screen.getAllByText('View Answers')[0]);

      await waitFor(() => screen.getByPlaceholderText('Write an answer'));
      await userEvent.type(screen.getByPlaceholderText('Write an answer'), 'My answer');
      await userEvent.click(screen.getByText('Post Answer'));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/answers'),
          { body: 'My answer' },
          expect.any(Object)
        );
      });
    });
  });

  describe('navigation', () => {
    it('navigates to correct page when nav item clicked', async () => {
      renderDiscussionsPage();
      await userEvent.click(screen.getByText('Reviews'));
      expect(mockNavigate).toHaveBeenCalledWith('/reviews');
    });

    it('calls logout when logout button clicked', async () => {
      const mockLogout = jest.fn();
      useAuth.mockReturnValue({
        token: 'fake-token',
        user: { full_name: 'Aryan Jaggi', email: 'ajaggi@umass.edu' },
        logout: mockLogout,
      });
      renderDiscussionsPage();
      await userEvent.click(screen.getByTitle('Logout'));
      expect(mockLogout).toHaveBeenCalled();
    });
  });
});
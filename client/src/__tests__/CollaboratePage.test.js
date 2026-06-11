import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CollaboratePage from '../pages/CollaboratePage';
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

const mockCourses = [
  { id: '1', code: 'COMPSCI 602', title: 'Research Methods' },
];

const mockPosts = [
  {
    id: 'p1',
    course_code: 'COMPSCI 602',
    title: 'Study group for final',
    tag: 'Study',
    member_count: 2,
    max_members: 4,
    is_author: false,
    is_member: false,
    group_formed: false,
    chat_link: null,
  },
  {
    id: 'p2',
    course_code: 'COMPSCI 532',
    title: 'Project partner needed',
    tag: 'Project',
    member_count: 4,
    max_members: 4,
    is_author: false,
    is_member: false,
    group_formed: false,
    chat_link: null,
  },
  {
    id: 'p3',
    course_code: 'COMPSCI 311',
    title: 'My own post',
    tag: 'Homework',
    member_count: 1,
    max_members: 3,
    is_author: true,
    is_member: true,
    group_formed: false,
    chat_link: null,
  },
  {
    id: 'p4',
    course_code: 'COMPSCI 445',
    title: 'Already joined',
    tag: 'Exam',
    member_count: 2,
    max_members: 4,
    is_author: false,
    is_member: true,
    group_formed: false,
    chat_link: null,
  },
];

beforeEach(() => {
  useAuth.mockReturnValue({
    token: 'fake-token',
    user: { full_name: 'Aryan Jaggi', email: 'ajaggi@umass.edu' },
    logout: jest.fn(),
  });
  axios.get.mockImplementation((url) => {
    if (url.includes('/courses/all')) return Promise.resolve({ data: { courses: mockCourses } });
    return Promise.resolve({ data: { posts: mockPosts } });
  });
  axios.post.mockResolvedValue({ data: {} });
  axios.patch.mockResolvedValue({ data: {} });
});

afterEach(() => {
  jest.clearAllMocks();
});

function renderCollaboratePage() {
  return render(
    <MemoryRouter>
      <CollaboratePage />
    </MemoryRouter>
  );
}

describe('CollaboratePage', () => {
  describe('rendering', () => {
    it('renders Collaboration Posts heading', async () => {
      renderCollaboratePage();
      expect(screen.getByText('Collaboration Posts')).toBeInTheDocument();
    });

    it('renders Create New Post form', () => {
      renderCollaboratePage();
      expect(screen.getByText('Create New Post')).toBeInTheDocument();
    });

    it('renders tag filter buttons', () => {
      renderCollaboratePage();
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getAllByText('Project').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Study').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Homework').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Exam').length).toBeGreaterThan(0);
    });

    it('renders search input', () => {
      renderCollaboratePage();
      expect(screen.getByPlaceholderText('Search courses/posts')).toBeInTheDocument();
    });
  });

  describe('loading posts', () => {
    it('loads and displays posts on mount', async () => {
      renderCollaboratePage();
      await waitFor(() => {
        expect(screen.getByText('Study group for final')).toBeInTheDocument();
        expect(screen.getByText('Project partner needed')).toBeInTheDocument();
      });
    });

    it('displays course badges', async () => {
      renderCollaboratePage();
      await waitFor(() => {
        expect(screen.getByText('COMPSCI 602')).toBeInTheDocument();
        expect(screen.getByText('COMPSCI 532')).toBeInTheDocument();
      });
    });

    it('shows empty message when no posts', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/courses/all')) return Promise.resolve({ data: { courses: [] } });
        return Promise.resolve({ data: { posts: [] } });
      });
      renderCollaboratePage();
      await waitFor(() => {
        expect(screen.getByText('No collaboration posts found.')).toBeInTheDocument();
      });
    });

    it('shows error when fetch fails', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));
      renderCollaboratePage();
      await waitFor(() => {
        expect(screen.getByText('Could not load collaboration posts.')).toBeInTheDocument();
      });
    });
  });

  describe('tag filtering', () => {
    it('fetches posts with tag filter when tag clicked', async () => {
      renderCollaboratePage();
      await waitFor(() => screen.getByText('Study group for final'));
      await userEvent.click(screen.getByRole('button', { name: 'Study' }));

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/api/collab/posts'),
          expect.objectContaining({ params: { tag: 'Study' } })
        );
      });
    });

    it('fetches without tag param when All clicked', async () => {
      renderCollaboratePage();
      await userEvent.click(screen.getByText('All'));

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/api/collab/posts'),
          expect.objectContaining({ params: {} })
        );
      });
    });
  });

  describe('search filtering', () => {
    it('filters posts by course code', async () => {
      renderCollaboratePage();
      await waitFor(() => screen.getByText('Study group for final'));
      await userEvent.type(screen.getByPlaceholderText('Search courses/posts'), 'COMPSCI 602');
      await waitFor(() => {
        expect(screen.getByText('Study group for final')).toBeInTheDocument();
        expect(screen.queryByText('Project partner needed')).not.toBeInTheDocument();
      });
    });

    it('filters posts by title', async () => {
      renderCollaboratePage();
      await waitFor(() => screen.getByText('Study group for final'));
      await userEvent.type(screen.getByPlaceholderText('Search courses/posts'), 'Project');
      await waitFor(() => {
        expect(screen.getByText('Project partner needed')).toBeInTheDocument();
        expect(screen.queryByText('Study group for final')).not.toBeInTheDocument();
      });
    });
  });

  describe('creating a post', () => {
    it('shows error when course code is empty', async () => {
      renderCollaboratePage();
      await userEvent.type(screen.getByPlaceholderText('Post title'), 'My Post');
      await userEvent.click(screen.getByText('Create Post'));
      await waitFor(() => {
        expect(screen.getByText('Please enter a course code and post title.')).toBeInTheDocument();
      });
    });

    it('shows error when title is empty', async () => {
      renderCollaboratePage();
      await waitFor(() => screen.getByText('COMPSCI 602 — Research Methods'));
      await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'COMPSCI 602');
      await userEvent.click(screen.getByText('Create Post'));
      await waitFor(() => {
        expect(screen.getByText('Please enter a course code and post title.')).toBeInTheDocument();
      });
    });

    it('submits post with correct data', async () => {
      renderCollaboratePage();
      await waitFor(() => screen.getByText('COMPSCI 602 — Research Methods'));
      await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'COMPSCI 602');
      await userEvent.type(screen.getByPlaceholderText('Post title'), 'My Study Group');
      await userEvent.click(screen.getByText('Create Post'));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/api/collab/posts'),
          expect.objectContaining({
            courseCode: 'COMPSCI 602',
            title: 'My Study Group',
          }),
          expect.any(Object)
        );
      });
    });

    it('clears form after successful creation', async () => {
      renderCollaboratePage();
      await waitFor(() => screen.getByText('COMPSCI 602 — Research Methods'));
      await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'COMPSCI 602');
      const titleInput = screen.getByPlaceholderText('Post title');
      await userEvent.type(titleInput, 'My Study Group');
      await userEvent.click(screen.getByText('Create Post'));

      await waitFor(() => {
        expect(titleInput.value).toBe('');
      });
    });

    it('defaults max members to 4 when empty', async () => {
      renderCollaboratePage();
      await waitFor(() => screen.getByText('COMPSCI 602 — Research Methods'));
      await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'COMPSCI 602');
      await userEvent.type(screen.getByPlaceholderText('Post title'), 'My Post');
      await userEvent.click(screen.getByText('Create Post'));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ maxMembers: 4 }),
          expect.any(Object)
        );
      });
    });
  });

  describe('joining and leaving', () => {
    it('shows Join button for posts user has not joined', async () => {
      renderCollaboratePage();
      await waitFor(() => {
        expect(screen.getAllByText('Join →').length).toBeGreaterThan(0);
      });
    });

    it('calls join endpoint when Join clicked', async () => {
      renderCollaboratePage();
      await waitFor(() => screen.getAllByText('Join →'));
      await userEvent.click(screen.getAllByText('Join →')[0]);
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/join'),
          {},
          expect.any(Object)
        );
      });
    });

    it('shows Leave button for posts user has joined', async () => {
      renderCollaboratePage();
      await waitFor(() => {
        expect(screen.getByText('Leave')).toBeInTheDocument();
      });
    });

    it('calls leave endpoint when Leave clicked', async () => {
      renderCollaboratePage();
      await waitFor(() => screen.getByText('Leave'));
      await userEvent.click(screen.getByText('Leave'));
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/leave'),
          {},
          expect.any(Object)
        );
      });
    });

    it('shows Full button disabled for full posts', async () => {
      renderCollaboratePage();
      await waitFor(() => {
        expect(screen.getByText('Full')).toBeInTheDocument();
        expect(screen.getByText('Full')).toBeDisabled();
      });
    });
  });

  describe('author post', () => {
    it('shows Your Post button for author', async () => {
      renderCollaboratePage();
      await waitFor(() => {
        expect(screen.getByText('Your Post')).toBeInTheDocument();
      });
    });

    it('opens modal when Your Post clicked', async () => {
      renderCollaboratePage();
      await waitFor(() => screen.getByText('Your Post'));
      await userEvent.click(screen.getByText('Your Post'));
      await waitFor(() => {
        expect(screen.getByText('Your collaboration post')).toBeInTheDocument();
      });
    });

    it('closes modal when close button clicked', async () => {
      renderCollaboratePage();
      await waitFor(() => screen.getByText('Your Post'));
      await userEvent.click(screen.getByText('Your Post'));
      await waitFor(() => screen.getByText('Your collaboration post'));
      await userEvent.click(screen.getByLabelText('Close'));
      await waitFor(() => {
        expect(screen.queryByText('Your collaboration post')).not.toBeInTheDocument();
      });
    });

    it('closes modal when Escape key pressed', async () => {
      renderCollaboratePage();
      await waitFor(() => screen.getByText('Your Post'));
      await userEvent.click(screen.getByText('Your Post'));
      await waitFor(() => screen.getByText('Your collaboration post'));
      fireEvent.keyDown(window, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByText('Your collaboration post')).not.toBeInTheDocument();
      });
    });
  });

  describe('group chat', () => {
    it('shows Open Group Chat button when group formed and has chat link and user is member', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/courses/all')) return Promise.resolve({ data: { courses: [] } });
        return Promise.resolve({ data: { posts: [{ ...mockPosts[3], group_formed: true, chat_link: 'https://chat.google.com/room/123' }] } });
      });
      renderCollaboratePage();
      await waitFor(() => {
        expect(screen.getByText('Open Group Chat')).toBeInTheDocument();
      });
    });

    it('shows Set Group Chat Link button when group formed and author has no link', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/courses/all')) return Promise.resolve({ data: { courses: [] } });
        return Promise.resolve({ data: { posts: [{ ...mockPosts[2], group_formed: true, chat_link: null }] } });
      });
      renderCollaboratePage();
      await waitFor(() => {
        expect(screen.getByText('Set Group Chat Link')).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('navigates to correct page when nav item clicked', async () => {
      renderCollaboratePage();
      await userEvent.click(screen.getByText('Reviews'));
      expect(mockNavigate).toHaveBeenCalledWith('/reviews');
    });

    it('navigates to group chat when member clicks post card', async () => {
      renderCollaboratePage();
      await waitFor(() => screen.getByText('Already joined'));
      const card = screen.getByText('Already joined').closest('.dash-card');
      await userEvent.click(card);
      expect(mockNavigate).toHaveBeenCalledWith('/collaborate/p4/chat');
    });
  });
});
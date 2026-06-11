import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CollabGroupChatPage from '../pages/CollabGroupChatPage';
import axios from 'axios';

jest.mock('axios');

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../apiUrl', () => ({
  apiUrl: (path) => `http://localhost:4000${path}`,
}));

import { useAuth } from '../context/AuthContext';

const mockPayload = {
  post: {
    id: 'p1',
    course_code: 'COMPSCI 602',
    title: 'Study group for final',
    group_formed: true,
    chat_link: null,
  },
  members: [
    { user_id: 'u1', full_name: 'Aryan Jaggi', email: 'ajaggi@umass.edu' },
    { user_id: 'u2', full_name: 'Pooja Vyas', email: 'pvyas@umass.edu' },
  ],
};

beforeEach(() => {
  useAuth.mockReturnValue({ token: 'fake-token' });
  delete window.location;
  window.location = { assign: jest.fn() };
  axios.get.mockResolvedValue({ data: mockPayload });
});

afterEach(() => {
  jest.clearAllMocks();
});

function renderPage(postId = 'p1') {
  return render(
    <MemoryRouter initialEntries={[`/collaborate/${postId}/chat`]}>
      <Routes>
        <Route path="/collaborate/:postId/chat" element={<CollabGroupChatPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('CollabGroupChatPage', () => {
  it('shows loading message initially', () => {
    axios.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Opening group chat…')).toBeInTheDocument();
  });

  it('renders back button', () => {
    renderPage();
    expect(screen.getByText('← Back to Collaborate')).toBeInTheDocument();
  });

  it('navigates back when back button clicked', async () => {
    renderPage();
    await userEvent.click(screen.getByText('← Back to Collaborate'));
    expect(mockNavigate).toHaveBeenCalledWith('/collaborate');
  });

  it('shows post title and course after load', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Study group for final')).toBeInTheDocument();
      expect(screen.getByText('COMPSCI 602')).toBeInTheDocument();
    });
  });

  it('shows members list', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Aryan Jaggi')).toBeInTheDocument();
      expect(screen.getByText('Pooja Vyas')).toBeInTheDocument();
    });
  });

  it('shows member emails', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('ajaggi@umass.edu')).toBeInTheDocument();
      expect(screen.getByText('pvyas@umass.edu')).toBeInTheDocument();
    });
  });

  it('shows no chat link message when group formed but no link', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/No chat link has been added yet/)).toBeInTheDocument();
    });
  });

  it('shows not full yet message when group not formed', async () => {
    axios.get.mockResolvedValue({
      data: {
        ...mockPayload,
        post: { ...mockPayload.post, group_formed: false },
      },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/This group is not full yet/)).toBeInTheDocument();
    });
  });

  it('redirects to chat link when link exists', async () => {
    axios.get.mockResolvedValue({
      data: {
        post: { ...mockPayload.post, chat_link: 'https://chat.google.com/room/123' },
        members: [],
      },
    });
    renderPage();
    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith('https://chat.google.com/room/123');
    });
  });

  it('shows error message when fetch fails', async () => {
    axios.get.mockRejectedValue({
      response: { data: { message: 'Not a member of this group.' } },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Not a member of this group.')).toBeInTheDocument();
    });
  });

  it('shows generic error when no response message', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Could not open group chat.')).toBeInTheDocument();
    });
  });

  it('shows join message in error state', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/join the post from the Collaborate page first/)).toBeInTheDocument();
    });
  });

  it('does not fetch when token is missing', () => {
    useAuth.mockReturnValue({ token: null });
    renderPage();
    expect(axios.get).not.toHaveBeenCalled();
  });
});
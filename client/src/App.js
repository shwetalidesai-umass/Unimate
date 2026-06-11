import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardPage from './pages/DashboardPage';
import CollaboratePage from './pages/CollaboratePage';
import CollabGroupChatPage from './pages/CollabGroupChatPage';
import DiscussionsPage from './pages/DiscussionsPage';
import ReviewsPage from './pages/ReviewsPage';
import AuthCallback from './pages/AuthCallback';
import ProtectedRoute from './components/shared/ProtectedRoute';
import React from 'react';
import SignInPage from './pages/SignInPage';
import OnboardingPage from './pages/OnboardingPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<SignInPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/collaborate/:postId/chat" element={<ProtectedRoute><CollabGroupChatPage /></ProtectedRoute>} />
          <Route path="/collaborate" element={<ProtectedRoute><CollaboratePage /></ProtectedRoute>} />
          <Route path="/discussions" element={<ProtectedRoute><DiscussionsPage /></ProtectedRoute>} />
          <Route path="/reviews" element={<ProtectedRoute><ReviewsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

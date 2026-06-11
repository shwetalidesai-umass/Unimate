import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function ProtectedRoute({ children }) {
  const { token, user } = useAuth();
  
  if (!token) return <Navigate to='/login' replace />;
  
  if (user && user.onboarding_done === false) {
    return <Navigate to='/onboarding' replace />;
  }
  
  return children;
}

export default ProtectedRoute;

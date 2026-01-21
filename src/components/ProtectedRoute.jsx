import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

function ProtectedRoute({ children }) {
  const { checkAuth } = useAuthStore();
  const location = useLocation();

  // Перевіряємо авторизацію
  const isAuthenticated = checkAuth();

  console.log('🛡️ ProtectedRoute check:', { isAuthenticated, path: location.pathname });

  if (!isAuthenticated) {
    console.log('❌ Not authenticated, redirecting to /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('✅ Authenticated, rendering children');
  return children;
}

export default ProtectedRoute;
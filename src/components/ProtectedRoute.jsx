import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

function ProtectedRoute({ children }) {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const location = useLocation();

  // Перевіряємо токен при завантаженні
  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isAuthenticated) {
    // Зберігаємо URL куди користувач хотів потрапити
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
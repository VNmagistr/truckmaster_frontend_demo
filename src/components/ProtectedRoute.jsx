import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, initialize } = useAuthStore();

  // Ініціалізуємо auth при монтуванні компонента
  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
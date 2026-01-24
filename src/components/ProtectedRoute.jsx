import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { LoadingSpinner } from './index';

function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, initialize } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Ініціалізуємо auth при монтуванні
    initialize();
    setIsInitialized(true);
  }, [initialize]);

  // Показуємо loading поки не ініціалізовано
  if (!isInitialized) {
    return <LoadingSpinner />;
  }

  // Після ініціалізації перевіряємо авторизацію
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
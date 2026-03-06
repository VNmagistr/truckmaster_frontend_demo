import React, { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import useCabinetAuthStore from '../store/cabinetAuthStore';

const CabinetProtectedRoute = ({ children }) => {
  const isAuthenticated = useCabinetAuthStore((state) => state.isAuthenticated);

  // Ініціалізуємо з localStorage один раз (без виклику set() під час рендеру)
  const authenticated = useMemo(() => {
    if (isAuthenticated) return true;
    // Читаємо напряму з localStorage — без оновлення стору під час рендеру
    const token = localStorage.getItem('cabinet_access_token');
    const user = localStorage.getItem('cabinet_user');
    if (token && user) {
      // Відкладаємо оновлення стору після рендеру
      setTimeout(() => useCabinetAuthStore.getState().initialize(), 0);
      return true;
    }
    return false;
  }, [isAuthenticated]);

  if (!authenticated) {
    return <Navigate to="/cabinet/login" replace />;
  }

  return children;
};

export default CabinetProtectedRoute;

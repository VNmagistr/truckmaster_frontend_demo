import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import useCabinetAuthStore from '../store/cabinetAuthStore';

const CabinetProtectedRoute = ({ children }) => {
  const { isAuthenticated, initialize } = useCabinetAuthStore();

  useEffect(() => {
    if (!isAuthenticated) initialize();
  }, []);

  const authenticated = isAuthenticated || useCabinetAuthStore.getState().initialize();

  if (!authenticated) {
    return <Navigate to="/cabinet/login" replace />;
  }

  return children;
};

export default CabinetProtectedRoute;

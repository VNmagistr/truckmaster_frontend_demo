import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import ukUA from 'antd/locale/uk_UA';
import dayjs from 'dayjs';
import 'dayjs/locale/uk';

import { MainLayout, AuthLayout } from './layouts';
import { ProtectedRoute, LoadingSpinner } from './components';

import { Welcome } from './pages'; 

// Lazy loading
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
// 🔥 Додано імпорт сторінки профілю
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));

// Clients
const ClientsPage = lazy(() => import('./pages/clients/ClientsPage'));
const ClientFormPage = lazy(() => import('./pages/clients/ClientFormPage'));
const ClientDetailPage = lazy(() => import('./pages/clients/ClientDetailPage'));

// Trucks
const TrucksPage = lazy(() => import('./pages/trucks/TrucksPage'));
const TruckFormPage = lazy(() => import('./pages/trucks/TruckFormPage'));
const TruckDetailPage = lazy(() => import('./pages/trucks/TruckDetailPage'));

// Orders
const OrdersPage = lazy(() => import('./pages/orders/OrdersPage'));
const OrderFormPage = lazy(() => import('./pages/orders/OrderFormPage'));
const OrderDetailPage = lazy(() => import('./pages/orders/OrderDetailPage'));

// Inventory
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage'));
const ProductFormPage = lazy(() => import('./pages/inventory/ProductFormPage'));
const ProductDetailPage = lazy(() => import('./pages/inventory/ProductDetailPage'));

// Bot
const BotPage = lazy(() => import('./pages/bot/BotPage'));

dayjs.locale('uk');

const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};

function AppRoutes() {
  return (
    <Routes>
      {/* 1. Головна сторінка */}
      <Route path="/" element={<Welcome />} />

      {/* 2. Сторінка логіну */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* 3. Захищені маршрути */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* 🔥 Додано маршрут профілю */}
        <Route path="/profile" element={<ProfilePage />} />
        
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/new" element={<ClientFormPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/clients/:id/edit" element={<ClientFormPage />} />

        <Route path="/trucks" element={<TrucksPage />} />
        <Route path="/trucks/new" element={<TruckFormPage />} />
        <Route path="/trucks/:id" element={<TruckDetailPage />} />
        <Route path="/trucks/:id/edit" element={<TruckFormPage />} />

        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/new" element={<OrderFormPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/orders/:id/edit" element={<OrderFormPage />} />

        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/new" element={<ProductFormPage />} />
        <Route path="/inventory/:id" element={<ProductDetailPage />} />
        <Route path="/inventory/:id/edit" element={<ProductFormPage />} />

        <Route path="/bot" element={<BotPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ConfigProvider locale={ukUA} theme={theme}>
      <AntApp>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <AppRoutes />
          </Suspense>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import ukUA from 'antd/locale/uk_UA';
import dayjs from 'dayjs';
import 'dayjs/locale/uk';

import { MainLayout, AuthLayout } from './layouts';
import { ProtectedRoute, LoadingSpinner } from './components';
import { Welcome } from './pages';

// Lazy loading для всіх сторінок
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const ClientFormPage = lazy(() => import('./pages/ClientFormPage'));
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'));
const TrucksPage = lazy(() => import('./pages/TrucksPage'));
const TruckFormPage = lazy(() => import('./pages/TruckFormPage'));
const TruckDetailPage = lazy(() => import('./pages/TruckDetailPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OrderFormPage = lazy(() => import('./pages/OrderFormPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const ProductFormPage = lazy(() => import('./pages/ProductFormPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const BotPage = lazy(() => import('./pages/BotPage'));

// Встановлюємо українську локаль для dayjs
dayjs.locale('uk');

// Тема Ant Design
const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};

function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Головна публічна сторінка (Welcome) */}
          <Route path="/" element={<Welcome />} />

          {/* Публічні маршрути (авторизація) */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Захищені маршрути */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route path="/dashboard" element={<DashboardPage />} />
            
            {/* Clients */}
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/new" element={<ClientFormPage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
            <Route path="/clients/:id/edit" element={<ClientFormPage />} />

            {/* Trucks */}
            <Route path="/trucks" element={<TrucksPage />} />
            <Route path="/trucks/new" element={<TruckFormPage />} />
            <Route path="/trucks/:id" element={<TruckDetailPage />} />
            <Route path="/trucks/:id/edit" element={<TruckFormPage />} />

            {/* Orders */}
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/new" element={<OrderFormPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/orders/:id/edit" element={<OrderFormPage />} />

            {/* Inventory */}
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory/new" element={<ProductFormPage />} />
            <Route path="/inventory/:id" element={<ProductDetailPage />} />
            <Route path="/inventory/:id/edit" element={<ProductFormPage />} />

            {/* Bot */}
            <Route path="/bot" element={<BotPage />} />
          </Route>

          {/* 404 - редірект на dashboard, якщо сторінку не знайдено */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ConfigProvider locale={ukUA} theme={theme}>
      <AntApp>
        <AppRoutes />
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
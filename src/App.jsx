import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import ukUA from 'antd/locale/uk_UA';
import dayjs from 'dayjs';
import 'dayjs/locale/uk';

import { MainLayout, AuthLayout } from './layouts';
import { ProtectedRoute } from './components';
import {
  LoginPage,
  DashboardPage,
  ClientsPage,
  ClientFormPage,
  ClientDetailPage,
  TrucksPage,
  TruckFormPage,
  TruckDetailPage,
  OrdersPage,
  OrderFormPage,
  OrderDetailPage,
  InventoryPage,
  ProductFormPage,
  ProductDetailPage,
  BotPage,
} from './pages';

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
      <Routes>
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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

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

        {/* 404 - редірект на dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
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
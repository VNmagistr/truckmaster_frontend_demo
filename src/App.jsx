import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import ukUA from 'antd/locale/uk_UA';
import dayjs from 'dayjs';
import 'dayjs/locale/uk';

import { MainLayout, AuthLayout } from './layouts';
import CabinetLayout from './layouts/CabinetLayout';
import { ProtectedRoute, LoadingSpinner } from './components';
import CabinetProtectedRoute from './components/CabinetProtectedRoute';

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

// Appointments
const AppointmentsPage = lazy(() => import('./pages/appointments/AppointmentsPage'));

// ALPR
const AlprPage = lazy(() => import('./pages/alpr/AlprPage'));

// Cabinet
const CabinetLoginPage = lazy(() => import('./pages/cabinet/CabinetLoginPage'));
const CabinetRegisterPage = lazy(() => import('./pages/cabinet/CabinetRegisterPage'));
const CabinetDashboard = lazy(() => import('./pages/cabinet/CabinetDashboard'));
const CabinetTrucksPage = lazy(() => import('./pages/cabinet/CabinetTrucksPage'));
const CabinetTruckDetail = lazy(() => import('./pages/cabinet/CabinetTruckDetail'));
const CabinetOrdersPage = lazy(() => import('./pages/cabinet/CabinetOrdersPage'));
const CabinetOrderDetail = lazy(() => import('./pages/cabinet/CabinetOrderDetail'));
const CabinetProfilePage = lazy(() => import('./pages/cabinet/CabinetProfilePage'));

dayjs.locale('uk');

const theme = {
  token: {
    colorPrimary: '#f5c518',
    colorTextLightSolid: '#1a1a1a',   // текст на жовтих кнопках — темний
    borderRadius: 4,
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  components: {
    Menu: {
      darkItemBg: '#1a1a1a',
      darkSubMenuItemBg: '#111111',
      darkItemHoverBg: '#2a2a2a',
      darkItemSelectedBg: '#f5c518',
      darkItemSelectedColor: '#1a1a1a',
      darkItemColor: 'rgba(255,255,255,0.72)',
    },
    Layout: {
      siderBg: '#1a1a1a',
      headerBg: '#ffffff',
      triggerBg: '#111111',
      triggerColor: 'rgba(255,255,255,0.65)',
    },
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
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/alpr" element={<AlprPage />} />
      </Route>

      {/* Cabinet — client portal */}
      <Route path="/cabinet/login" element={<CabinetLoginPage />} />
      <Route path="/cabinet/register" element={<CabinetRegisterPage />} />
      <Route
        path="/cabinet"
        element={
          <CabinetProtectedRoute>
            <CabinetLayout />
          </CabinetProtectedRoute>
        }
      >
        <Route index element={<CabinetDashboard />} />
        <Route path="trucks" element={<CabinetTrucksPage />} />
        <Route path="trucks/:id" element={<CabinetTruckDetail />} />
        <Route path="orders" element={<CabinetOrdersPage />} />
        <Route path="orders/:id" element={<CabinetOrderDetail />} />
        <Route path="profile" element={<CabinetProfilePage />} />
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
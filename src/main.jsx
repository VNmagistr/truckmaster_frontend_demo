import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './i18n';
import useAuthStore from './store/authStore';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Перехоплюємо prompt встановлення PWA і блокуємо авто-показ.
// Показуємо кнопку встановлення тільки авторизованому персоналу в MainLayout.
window.__pwaInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__pwaInstallPrompt = e;
  window.dispatchEvent(new Event('pwainstallready'));
});

// Ініціалізуємо auth store ДО рендеру додатку
useAuthStore.getState().initialize();

// Створюємо QueryClient для React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 хвилин
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);
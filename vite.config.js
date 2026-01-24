import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // 1. Всі UI-бібліотеки (Ant Design та його внутрішні `rc-` залежності)
              // Це найважча частина, її відокремлюємо для кешування
              if (id.includes('antd') || 
                  id.includes('@ant-design') || 
                  id.includes('rc-') || 
                  id.includes('ant-design')) {
                return 'ui-libs';
              }
              
              // 2. Все інше (React, React Router, Axios, Dayjs...)
              // Залишаємо разом у 'vendor', щоб уникнути помилок ініціалізації React
              return 'vendor';
            }
          },
        },
      },
    },
  };
});
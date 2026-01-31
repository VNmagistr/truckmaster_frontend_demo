import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    // Збільшуємо ліміт попередження (щоб не "кричало" дарма)
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Оця магія розбиває великий файл на менші
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Виносимо Ant Design в окремий файл (він найбільший)
            if (id.includes('antd') || id.includes('@ant-design')) {
              return 'antd';
            }
            // Виносимо React та роутер
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            // Всі інші бібліотеки
            return 'vendor';
          }
        },
      },
    },
  },
});
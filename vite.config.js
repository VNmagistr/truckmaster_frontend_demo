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
      sourcemap: false, // Вимикаємо карти коду для зменшення розміру
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // --- МАГІЯ РОЗДІЛЕННЯ КОДУ ---
          manualChunks: (id) => {
            // 1. Окремий чанк для ядра React (він змінюється рідко)
            if (id.includes('node_modules/react') || 
                id.includes('node_modules/react-dom') || 
                id.includes('node_modules/react-router-dom')) {
              return 'vendor-react';
            }
            
            // 2. Окремий чанк для Ant Design (найважча бібліотека)
            if (id.includes('node_modules/antd') || 
                id.includes('node_modules/@ant-design')) {
              return 'vendor-antd';
            }
            
            // 3. Окремий чанк для утиліт (axios, dayjs)
            if (id.includes('node_modules/axios') || 
                id.includes('node_modules/dayjs')) {
              return 'vendor-utils';
            }

            // 4. Всі інші бібліотеки в загальний vendor
            if (id.includes('node_modules')) {
              return 'vendor-others';
            }
          },
        },
      },
    },
  };
});
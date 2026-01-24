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
      chunkSizeWarningLimit: 1500, // Підняли ліміт, щоб не сварився на великий vendor файл
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // ПРОСТА І НАДІЙНА СТРАТЕГІЯ:
            // Всі бібліотеки (node_modules) збираємо в один файл 'vendor'.
            // Це гарантує, що React, Antd та інші залежності будуть "бачити" одне одного.
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
    },
  };
});
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    // Просто піднімаємо ліміт, щоб не було попереджень
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        // 🔥 ПРИБИРАЄМО manualChunks - це вирішить проблему з createContext
        manualChunks: undefined,
      },
    },
  },
});
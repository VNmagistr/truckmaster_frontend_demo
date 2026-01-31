import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    // Збільшуємо ліміт до 3MB, щоб не бачити жовтих попереджень
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        // Видаляємо manualChunks, бо він спричиняє помилку з createContext
        manualChunks: undefined,
      },
    },
  },
});
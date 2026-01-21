import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,

      setAuth: (userData, accessToken, refreshToken) => {
        set({
          user: userData,
          isAuthenticated: true,
          accessToken,
          refreshToken,
        });
      },

      updateAccessToken: (accessToken) => {
        set({ accessToken });
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
        });
      },

      checkAuth: () => {
        const state = get();
        return state.isAuthenticated && state.accessToken && state.refreshToken;
      },
    }),
    {
      name: 'auth-storage',
      // ВИДАЛЕНО partialize - зберігаємо ВСЕ
    }
  )
);

export default useAuthStore;
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
        console.log('🔐 setAuth called:', { userData, accessToken: accessToken?.substring(0, 20) + '...', refreshToken: refreshToken?.substring(0, 20) + '...' });
        
        set({
          user: userData,
          isAuthenticated: true,
          accessToken,
          refreshToken,
        });
        
        console.log('✅ State after setAuth:', {
          user: get().user,
          isAuthenticated: get().isAuthenticated,
          hasAccessToken: !!get().accessToken,
          hasRefreshToken: !!get().refreshToken,
        });
      },

      updateAccessToken: (accessToken) => {
        console.log('🔄 updateAccessToken called');
        set({ accessToken });
      },

      logout: () => {
        console.log('🚪 logout called');
        set({
          user: null,
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
        });
      },

      checkAuth: () => {
        const state = get();
        const isAuth = state.isAuthenticated && !!state.accessToken && !!state.refreshToken;
        console.log('🔍 checkAuth:', {
          isAuthenticated: state.isAuthenticated,
          hasAccessToken: !!state.accessToken,
          hasRefreshToken: !!state.refreshToken,
          result: isAuth,
        });
        return isAuth;
      },
    }),
    {
      name: 'auth-storage',
      // НЕ використовуємо partialize - зберігаємо ВСЕ
    }
  )
);

export default useAuthStore;
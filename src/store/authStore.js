import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,

  // Ініціалізація з localStorage при завантаженні
  initialize: () => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const userStr = localStorage.getItem('user');
    
    if (accessToken && refreshToken && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, isAuthenticated: true });
        return true;
      } catch (e) {
        localStorage.clear();
        return false;
      }
    }
    return false;
  },

  setAuth: (userData, accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    
    set({
      user: userData,
      isAuthenticated: true,
    });
  },

  updateAccessToken: (accessToken) => {
    localStorage.setItem('access_token', accessToken);
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  getAccessToken: () => localStorage.getItem('access_token'),
  getRefreshToken: () => localStorage.getItem('refresh_token'),
}));

export default useAuthStore;
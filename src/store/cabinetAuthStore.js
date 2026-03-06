import { create } from 'zustand';

const useCabinetAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,

  initialize: () => {
    const accessToken = localStorage.getItem('cabinet_access_token');
    const refreshToken = localStorage.getItem('cabinet_refresh_token');
    const userStr = localStorage.getItem('cabinet_user');

    if (accessToken && refreshToken && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, isAuthenticated: true });
        return true;
      } catch {
        localStorage.removeItem('cabinet_access_token');
        localStorage.removeItem('cabinet_refresh_token');
        localStorage.removeItem('cabinet_user');
        return false;
      }
    }
    return false;
  },

  setAuth: (userData, accessToken, refreshToken) => {
    localStorage.setItem('cabinet_access_token', accessToken);
    localStorage.setItem('cabinet_refresh_token', refreshToken);
    localStorage.setItem('cabinet_user', JSON.stringify(userData));
    set({ user: userData, isAuthenticated: true });
  },

  updateAccessToken: (accessToken) => {
    localStorage.setItem('cabinet_access_token', accessToken);
  },

  logout: () => {
    localStorage.removeItem('cabinet_access_token');
    localStorage.removeItem('cabinet_refresh_token');
    localStorage.removeItem('cabinet_user');
    set({ user: null, isAuthenticated: false });
  },

  getAccessToken: () => localStorage.getItem('cabinet_access_token'),
  getRefreshToken: () => localStorage.getItem('cabinet_refresh_token'),
}));

export default useCabinetAuthStore;

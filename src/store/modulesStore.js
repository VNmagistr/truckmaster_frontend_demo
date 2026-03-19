import { create } from 'zustand';
import instance from '../api';

const useModulesStore = create((set, get) => ({
  // { name: is_enabled } — заповнюється після fetchModules()
  modules: {},
  loaded: false,

  fetchModules: async () => {
    try {
      const res = await instance.get('/modules/');
      const modules = {};
      res.data.forEach((m) => { modules[m.name] = m.is_enabled; });
      set({ modules, loaded: true });
    } catch {
      // У разі помилки — показуємо всі пункти (fail-open)
      set({ loaded: true });
    }
  },

  // Повертає true якщо модуль увімкнений або невідомий
  isEnabled: (name) => {
    const { modules, loaded } = get();
    if (!loaded || !(name in modules)) return true;
    return modules[name];
  },
}));

export default useModulesStore;

import { create } from 'zustand';
import instance from '../api';

// Запасні значення — використовуються до того, як завершиться fetchEnums(),
// або якщо API недоступне. Бекендне джерело істини — /api/enums/.
const FALLBACK_EURO = [
  { value: 'EURO3', label: 'Євро-3' },
  { value: 'EURO4', label: 'Євро-4' },
  { value: 'EURO5', label: 'Євро-5' },
  { value: 'EURO6', label: 'Євро-6' },
];
const FALLBACK_TRANSMISSION = [
  { value: 'manual',    label: 'Механічна' },
  { value: 'automatic', label: 'Автоматична' },
  { value: 'robotic',   label: 'Роботизована' },
];
const FALLBACK_TRACKING = [
  { value: 'mileage',      label: 'По кілометражу' },
  { value: 'engine_hours', label: 'По мотогодинах' },
];

const toMap = (arr) => Object.fromEntries((arr || []).map((o) => [o.value, o]));

const useEnumsStore = create((set, get) => ({
  euroStandards:       FALLBACK_EURO,
  euroByValue:         toMap(FALLBACK_EURO),
  transmissionTypes:   FALLBACK_TRANSMISSION,
  transmissionByValue: toMap(FALLBACK_TRANSMISSION),
  trackingModes:       FALLBACK_TRACKING,
  trackingByValue:     toMap(FALLBACK_TRACKING),
  loaded: false,

  fetchEnums: async () => {
    if (get().loaded) return;
    try {
      const res  = await instance.get('/enums/');
      const data = res.data || res;
      const eu = data.euro_standards     || FALLBACK_EURO;
      const tr = data.transmission_types || FALLBACK_TRANSMISSION;
      const tm = data.tracking_modes     || FALLBACK_TRACKING;
      set({
        euroStandards:       eu,
        euroByValue:         toMap(eu),
        transmissionTypes:   tr,
        transmissionByValue: toMap(tr),
        trackingModes:       tm,
        trackingByValue:     toMap(tm),
        loaded: true,
      });
    } catch {
      // мовчки лишаємо fallback-значення
      set({ loaded: true });
    }
  },
}));

export default useEnumsStore;

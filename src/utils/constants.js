import i18n from '../i18n';

const t = (key) => i18n.t(key);

// Статуси замовлень
export const ORDER_STATUSES = {
  OPEN: { value: 'OPEN', get label() { return t('statuses.OPEN'); }, color: 'blue' },
  IN_PROGRESS: { value: 'IN_PROGRESS', get label() { return t('statuses.IN_PROGRESS'); }, color: 'orange' },
  DONE: { value: 'DONE', get label() { return t('statuses.DONE'); }, color: 'cyan' },
  CLOSED: { value: 'CLOSED', get label() { return t('statuses.CLOSED'); }, color: 'green' },
  CANCELED: { value: 'CANCELED', get label() { return t('statuses.CANCELED'); }, color: 'red' },
};

// Типи КПП та Євростандарти переїхали в `useEnumsStore` (джерело — GET /api/enums/).
// Імпортуй з `src/store/enumsStore.js` через хук, не дублюй тут.

// Одиниці виміру
export const UNITS = {
  pcs: { value: 'pcs', get label() { return t('units.pcs'); } },
  l: { value: 'l', get label() { return t('units.l'); } },
  kg: { value: 'kg', get label() { return t('units.kg'); } },
  pack: { value: 'pack', get label() { return t('units.pack'); } },
  m: { value: 'm', get label() { return t('units.m'); } },
};

// Типи категорій товарів
export const CATEGORY_TYPES = {
  oil: { value: 'oil', get label() { return t('categoryTypes.oil'); } },
  filter: { value: 'filter', get label() { return t('categoryTypes.filter'); } },
  fluid: { value: 'fluid', get label() { return t('categoryTypes.fluid'); } },
  washer: { value: 'washer', get label() { return t('categoryTypes.washer'); } },
  part: { value: 'part', get label() { return t('categoryTypes.part'); } },
  other: { value: 'other', get label() { return t('categoryTypes.other'); } },
};

// Пріоритети нагадувань
export const REMINDER_PRIORITIES = {
  low: { value: 'low', get label() { return t('reminderPriorities.low'); }, color: 'default' },
  medium: { value: 'medium', get label() { return t('reminderPriorities.medium'); }, color: 'blue' },
  high: { value: 'high', get label() { return t('reminderPriorities.high'); }, color: 'orange' },
  critical: { value: 'critical', get label() { return t('reminderPriorities.critical'); }, color: 'red' },
};

// Статуси нагадувань
export const REMINDER_STATUSES = {
  pending: { value: 'pending', get label() { return t('reminderStatuses.pending'); }, color: 'default' },
  notified: { value: 'notified', get label() { return t('reminderStatuses.notified'); }, color: 'blue' },
  completed: { value: 'completed', get label() { return t('reminderStatuses.completed'); }, color: 'green' },
  overdue: { value: 'overdue', get label() { return t('reminderStatuses.overdue'); }, color: 'red' },
  dismissed: { value: 'dismissed', get label() { return t('reminderStatuses.dismissed'); }, color: 'default' },
};

// Кольори для графіків
export const CHART_COLORS = [
  '#1890ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#fa8c16',
];
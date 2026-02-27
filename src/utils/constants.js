// Статуси замовлень
export const ORDER_STATUSES = {
  OPEN: { value: 'OPEN', label: 'Відкрито', color: 'blue' },
  IN_PROGRESS: { value: 'IN_PROGRESS', label: 'В роботі', color: 'orange' },
  DONE: { value: 'DONE', label: 'Виконано', color: 'cyan' },
  CLOSED: { value: 'CLOSED', label: 'Закрито', color: 'green' },
  CANCELED: { value: 'CANCELED', label: 'Скасовано', color: 'red' },
};

// Євростандарти
export const EURO_STANDARDS = {
  EURO3: { value: 'EURO3', label: 'Євро-3' },
  EURO4: { value: 'EURO4', label: 'Євро-4' },
  EURO5: { value: 'EURO5', label: 'Євро-5' },
  EURO6: { value: 'EURO6', label: 'Євро-6' },
};

// Одиниці виміру
export const UNITS = {
  pcs: { value: 'pcs', label: 'шт' },
  l: { value: 'l', label: 'л' },
  kg: { value: 'kg', label: 'кг' },
  pack: { value: 'pack', label: 'уп' },
  m: { value: 'm', label: 'м' },
};

// Типи категорій товарів
export const CATEGORY_TYPES = {
  oil: { value: 'oil', label: 'Оливи' },
  filter: { value: 'filter', label: 'Фільтри' },
  fluid: { value: 'fluid', label: 'Технічні рідини' },
  washer: { value: 'washer', label: 'Омивачі' },
  part: { value: 'part', label: 'Запчастини' },
  other: { value: 'other', label: 'Інше' },
};

// Пріоритети нагадувань
export const REMINDER_PRIORITIES = {
  low: { value: 'low', label: 'Низький', color: 'default' },
  medium: { value: 'medium', label: 'Середній', color: 'blue' },
  high: { value: 'high', label: 'Високий', color: 'orange' },
  critical: { value: 'critical', label: 'Критичний', color: 'red' },
};

// Статуси нагадувань
export const REMINDER_STATUSES = {
  pending: { value: 'pending', label: 'Очікує', color: 'default' },
  notified: { value: 'notified', label: 'Сповіщено', color: 'blue' },
  completed: { value: 'completed', label: 'Виконано', color: 'green' },
  overdue: { value: 'overdue', label: 'Прострочено', color: 'red' },
  dismissed: { value: 'dismissed', label: 'Відхилено', color: 'default' },
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
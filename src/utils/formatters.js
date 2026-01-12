import dayjs from 'dayjs';
import 'dayjs/locale/uk';

dayjs.locale('uk');

// Форматування дати
export const formatDate = (date, format = 'DD.MM.YYYY') => {
  if (!date) return '-';
  return dayjs(date).format(format);
};

// Форматування дати з часом
export const formatDateTime = (date, format = 'DD.MM.YYYY HH:mm') => {
  if (!date) return '-';
  return dayjs(date).format(format);
};

// Форматування відносного часу (наприклад, "2 години тому")
export const formatRelativeTime = (date) => {
  if (!date) return '-';
  return dayjs(date).fromNow();
};

// Форматування грошей
export const formatMoney = (amount, currency = 'грн') => {
  if (amount === null || amount === undefined) return '-';
  return `${Number(amount).toLocaleString('uk-UA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
};

// Форматування пробігу
export const formatMileage = (mileage) => {
  if (mileage === null || mileage === undefined) return '-';
  return `${Number(mileage).toLocaleString('uk-UA')} км`;
};

// Форматування телефону
export const formatPhone = (phone) => {
  if (!phone) return '-';
  // Очищаємо від нецифрових символів
  const cleaned = phone.replace(/\D/g, '');
  // Формат: +38 (0XX) XXX-XX-XX
  if (cleaned.length === 12 && cleaned.startsWith('38')) {
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8, 10)}-${cleaned.slice(10, 12)}`;
  }
  return phone;
};

// Скорочення тексту
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};
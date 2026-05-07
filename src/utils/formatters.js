import dayjs from 'dayjs';
import 'dayjs/locale/uk';
import 'dayjs/locale/en';
import i18n from '../i18n';

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
export const formatMoney = (amount, currency) => {
  if (amount === null || amount === undefined) return '-';
  const cur = currency || i18n.t('common.uah');
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'uk-UA';
  return `${Number(amount).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${cur}`;
};

// Форматування пробігу
export const formatMileage = (mileage) => {
  if (mileage === null || mileage === undefined) return '-';
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'uk-UA';
  return `${Number(mileage).toLocaleString(locale)} ${i18n.t('common.km')}`;
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
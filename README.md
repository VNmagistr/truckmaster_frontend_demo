# TruckMaster CRM — Frontend

React-інтерфейс CRM-системи для сервісного центру вантажних автомобілів Iveco.
Це демонстраційна версія. Backend: [truckmaster_demo](https://github.com/VNmagistr/truckmaster_demo)

## Можливості

- Дашборд з ключовими показниками
- Управління клієнтами та вантажівками
- Наряди-замовлення: створення, зміна статусів, PDF-документи
- Склад та облік запчастин
- Рахунки з інтеграцією Nova Poshta
- Записи на сервіс (календар)
- Особистий кабінет клієнта (окрема авторизація)
- Адаптивний дизайн (мобільна версія)

## Швидкий старт

### 1. Клонування та залежності

```bash
git clone https://github.com/VNmagistr/truckmaster_frontend_demo.git
cd truckmaster_frontend_demo
npm install
```

### 2. Налаштування середовища

```bash
cp .env.example .env
```

За замовчуванням фронтенд підключається до `http://localhost:8000/api` — локального бекенду.
Щоб запустити бекенд, див. [truckmaster_demo](https://github.com/VNmagistr/truckmaster_demo).

### 3. Запуск

```bash
npm run dev
```

Відкрийте: http://localhost:3000

Логін: `admin` / Пароль: `demo1234` *(після запуску `create_demo_data` на бекенді)*

## Змінні середовища

| Змінна | Опис | За замовчуванням |
|--------|------|-----------------|
| `VITE_API_URL` | URL бекенд API | `http://localhost:8000/api` |

## Технології

- React 18 + Vite
- Ant Design 5
- Zustand (state management)
- Axios
- React Router v6
- React Big Calendar
- ReportLab PDF (через бекенд)

## Структура додатку

| Шлях | Опис |
|------|------|
| `/` | Лендінг (публічна сторінка) |
| `/login` | Вхід для персоналу |
| `/dashboard` | Головна панель |
| `/clients` | Клієнти |
| `/trucks` | Вантажівки |
| `/orders` | Наряди-замовлення |
| `/inventory` | Склад |
| `/invoices` | Рахунки |
| `/appointments` | Записи на сервіс |
| `/cabinet` | Особистий кабінет клієнта |
| `/admin` | Django Admin (на бекенді) |

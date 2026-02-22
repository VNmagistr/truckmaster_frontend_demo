# TruckMaster Frontend — CLAUDE.md

CRM-система для сервісного центру вантажних автомобілів (Iveco). Облік клієнтів, авто, наряд-замовлень, складу запчастин, Telegram-бота.

## Команди

```bash
npm run dev      # dev-сервер на http://localhost:3000
npm run build    # production build
npm run lint     # ESLint (0 warnings дозволено)
npm run preview  # перегляд build
```

## Стек

- **React 18** + **Vite 5** (JSX, без TypeScript)
- **Ant Design 5** — весь UI, локаль `uk_UA`, тема в `App.jsx`
- **React Router 6** — клієнтський роутинг, всі сторінки lazy-loaded
- **Zustand 4** — глобальний стан (auth, UI)
- **Axios** — HTTP-клієнт з interceptors
- **React Query 5** — підключено, але поки не використовується в сторінках
- **DayJS** — дати з українською локаллю (`uk`)
- **Recharts** — графіки на дашборді

## Структура

```
src/
├── api/
│   └── index.js          # ЄДИНИЙ файл API — всі методи тут
├── components/            # LoadingSpinner, PageHeader, StatusTag, EmptyState, ConfirmDelete, ProtectedRoute
├── layouts/               # MainLayout (основний), AuthLayout (для логіну)
├── pages/
│   ├── auth/             # LoginPage
│   ├── dashboard/        # DashboardPage
│   ├── clients/          # ClientsPage, ClientFormPage, ClientDetailPage
│   ├── trucks/           # TrucksPage, TruckFormPage, TruckDetailPage
│   ├── orders/           # OrdersPage, OrderFormPage, OrderDetailPage
│   ├── inventory/        # InventoryPage, ProductFormPage, ProductDetailPage
│   ├── bot/              # BotPage (mock-дані)
│   ├── profile/          # ProfilePage
│   └── welcome/          # Welcome (публічна)
├── store/
│   ├── authStore.js      # user, isAuthenticated, setAuth, logout, updateAccessToken
│   └── uiStore.js        # sidebarCollapsed, theme, language (persisted)
└── utils/
    ├── constants.js      # ORDER_STATUSES, EURO_STANDARDS, UNITS, CATEGORY_TYPES, ...
    └── formatters.js     # formatDate, formatDateTime, formatMoney, formatPhone, formatMileage
```

## API-шар

Весь API — в **`src/api/index.js`**. Експортує named exports:

```js
import { clientsAPI, trucksAPI, ordersAPI, inventoryAPI, userAPI, authAPI,
         worksAPI, workGroupsAPI, employeesAPI, baseModelsAPI, maintenanceAPI } from '../../api';
```

**Interceptors:**
- Request: додає `Authorization: Bearer <token>` з `localStorage`
- Response: при 401 — рефреш токену з чергою (`failedQueue`) для конкурентних запитів; при відсутності refresh token — `logout()` і редірект на `/login`
- `/token/` та `/register/` — виключені з логіки рефрешу

**Розпакування відповідей** — Axios завжди повертає `response.data`, але в коді для надійності використовується патерн:
```js
const data = response.data || response;
```

**Django pagination** — сервер повертає `{ count, next, previous, results }`:
```js
setItems(data.results || []);
setTotal(data.count || 0);
```

## Аутентифікація

- Токени: `localStorage` (`access_token`, `refresh_token`, `user`)
- `authStore.js`: `setAuth(userData, access, refresh)`, `logout()`, `updateAccessToken(access)`
- `ProtectedRoute` — перевіряє `isAuthenticated` зі store

## Роутинг

Патерн для кожного розділу:
```
/resource              → ListPage
/resource/new          → FormPage (create)
/resource/:id          → DetailPage
/resource/:id/edit     → FormPage (edit)
```

FormPage визначає режим через `const isEdit = Boolean(id)`.

## UI-конвенції

- **Мова інтерфейсу**: українська
- **Дати**: формат `DD.MM.YYYY`, час `DD.MM.YYYY HH:mm`
- **Гроші**: `formatMoney(amount)` → `"1 234,56 грн"`
- **Помилки**: завжди через `message.error('...')` від Ant Design, **не** `console.error`
- **Завантаження**: `<LoadingSpinner />` або `loading` prop на `Table`
- **Порожній стан**: `<EmptyState />` з текстом та опціональною кнопкою
- **Заголовки сторінок**: `<PageHeader title="..." showBack extra={...} />`
- **Статуси**: `<StatusTag status={status} type="order" />`
- **Пошук**: debounce 600ms, скидання пагінації на 1 при зміні пошуку
- **Пагінація**: `page_size: 20`, `ordering: '-created_at'` за замовчуванням
- **Nullable поля**: завжди рендерити з fallback: `value || '-'`, `vin ? \`...${vin}\` : '-'`

## Константи

```js
import { ORDER_STATUSES, EURO_STANDARDS, UNITS, CATEGORY_TYPES } from '../../utils/constants';
// Використання:
ORDER_STATUSES.OPEN → { value: 'OPEN', label: 'Відкрито', color: 'blue' }
UNITS.pcs → { value: 'pcs', label: 'шт' }
```

## Формат даних з API — ключові особливості

### Вантажівки (`/trucks/`)

**List** (`GET /trucks/`) повертає `TruckListSerializer`:
```json
{
  "id": 1,
  "license_plate": "ВС1657ОМ",
  "specific_model_name": "70C17",
  "last_seven_vin": "5056457",
  "base_model": "70C17",
  "client": { "id": 42, "name": "Цвігун Роман Ярославович" },
  "client_id": 42,
  "marked_for_deletion": false
}
```
`client` — завжди вкладений об'єкт `{id, name}` або `null`. Використовуй `record.client?.id`, `record.client?.name`.

**Detail** (`GET /trucks/:id/`) повертає `TruckDetailSerializer` (`fields = '__all__'`):
- `client` — числовий ID (не об'єкт!)
- `base_model` — числовий ID
- Фронтенд TruckDetailPage окремо підтягує client і base_model по ID

### Клієнти (`/clients/`)
- `phone` — може бути `null` (не всі клієнти мають телефон)
- `telegram_chat_id` — nullable, показує підключення боту

### Замовлення (`/orders/`)
- `truck` — вкладений об'єкт з `license_plate` у списку
- `ServiceWork.work` — FK→WorkPrice, може бути `null` (ручний запис без прив'язки)
- `UsedPart.service_work = null` — "прямі запчастини" ТО-набору (direct_parts)

## Env

| Файл | VITE_API_URL |
|------|-------------|
| `.env.development` | `http://localhost:8000/api` |
| `.env.production` | `http://REMOVED/api` (без HTTPS, без домену) |

## Відомі обмеження

- **BotPage** — повністю на mock-даних, API не підключено
- **Dashboard** — графік на mock-даних (hardcoded тижень); `openOrders`, `inProgressOrders`, `monthlyRevenue` = 0
- **Токени в localStorage** — вразливо до XSS; httpOnly cookies не реалізовано
- **Немає тестів** — жодного test-файлу в проекті
- **React Query** — підключено в залежностях, але сторінки використовують `useState` + `useEffect` для даних
- **`manualChunks: undefined`** у vite.config.js — навмисно, вирішує баг з `createContext` при chunking
- **TruckDetailPage** — отримує `base_model` як ID і робить `baseModelsAPI.getAll()` щоб знайти назву (неоптимально, але працює)
- **TruckFormPage** — список клієнтів обмежено 50; якщо власник не в першій сторінці — є окремий fallback-запит по ID

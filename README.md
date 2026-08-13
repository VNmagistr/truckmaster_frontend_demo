# TruckMaster — Frontend

React CRM application for an Iveco heavy truck service center ("Ital Truck").

## Stack

- React 18 + Vite
- Ant Design 5 (UI components)
- Zustand (state management)
- Axios (HTTP)
- React Router v6

## Local Setup

```bash
npm install
cp .env.example .env   # set VITE_API_URL
npm run dev
```

## Environment Variables

```env
VITE_API_URL=https://api.ital-truck.com.ua
```

## Structure

```
src/
├── api/           — Axios clients (staff + cabinet)
├── assets/        — Logo, truck images
├── components/    — Shared components
├── layouts/       — MainLayout, AuthLayout, CabinetLayout
├── pages/
│   ├── auth/      — Staff login
│   ├── cabinet/   — Client personal portal (8 pages)
│   ├── clients/   — Clients and vehicles
│   ├── dashboard/ — Main dashboard
│   ├── inventory/ — Spare parts warehouse
│   ├── invoices/  — Invoices
│   ├── orders/    — Service orders
│   ├── appointments/ — Service bookings
│   └── welcome/   — Public landing page
└── store/         — Zustand stores (auth, cabinetAuth, modules)
```

## Inventory Section

| Tab | Description |
|-----|-------------|
| All Products | Full list with search and filters |
| Low Stock | Products below minimum stock level |
| Wholesale | Stock levels by warehouse, incoming, transfers |
| Order | Folders with product lists for ordering |

### "Order" Tab — Full Cycle

```
Need to order → (toggle) → Ordered → (button) → Received
```

- **Folders** — group items (archive, search with highlighting)
- **Item** — name, quantity, unit, purchase price, notes
- **Stocking** — search for match in product database or create new product → select warehouse → auto-update stock levels + StockMovement
- **Receive All** — bulk stocking of all ordered+linked items in a folder with one click
- **Purchase price** — required for stocking (> 0), recorded in StockMovement for profitability analytics

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#f5c518` | Yellow accent |
| Ink | `#1a1a1a` | Primary text |
| BG | `#ffffff` | Background |
| BG2 | `#f7f7f7` | Secondary background |

## Changelog

### v2.15 — 2026-08-13
- **Scheduled maintenance dropdown**: replaced "Add maintenance set" button with a "Scheduled maintenance" dropdown (5 categories: engine oil & filters, gearbox/auto gearbox oil, rear axle oil, belts & rollers, timing chains); auto-selects matching maintenance rule by keyword matching on rule name
- **Stale orders — per-order postpone**: individual orders can be postponed for 3, 7, 14 or 30 days via a popover button in the reminder modal; postponed orders are stored in localStorage and filtered out until expiry

### v2.7 — 2026-04-02
- **Inventory / Order — Stocking**: "Arrived" button on each ordered item; modal with auto-search by name; "Exists in DB" or "New product" options; `linked_product` binding; automatic `StockItem` + `StockMovement` update
- **Bulk stocking**: "Receive All" button in folder header — stocks all ordered+linked items with one click
- **Purchase price**: field on item and required validation (> 0) on stocking; recorded in stock movements for profitability analytics
- **Folder archive**: archive button, "Show archive" filter, restore from archive, delete only for archived
- **Content search**: real-time filter by folder and item names with match highlighting

### v2.6 — 2026-04-02
- **Inventory / Wholesale**: stock levels by any warehouse; "Incoming" modal; "Transfer" modal between warehouses
- **Inventory / Order**: order folders; items with statuses; "Mark all ordered"
- **Product search**: server-side search in dropdowns (supports 11k+ products)

### v2.5 — 2026-03-23
- Client personal portal (8 pages)
- Client email verification

### v2.4
- Nova Poshta shipment tracking in bot and invoices
- Auto-load tracking number status on invoice open

### v2.3
- Hide disabled modules from menu
- Landing page with Google reviews and map

### v2.2
- Spare parts warehouse: product list, details, form

### v2.1
- Invoices with line items and statuses

### v2.0
- Service orders, work items, spare parts, photos

### v1.x
- Clients, vehicles, authorization

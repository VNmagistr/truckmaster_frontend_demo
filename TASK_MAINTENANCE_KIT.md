# Задача: Виправити логіку кнопки "Додати набір ТО"

## Проблема

Кнопка "Додати набір ТО" вже є в `OrderDetailPage.jsx`, але **не працює правильно**:

1. `handleOpenKitModal` — неправильно парсить відповідь бекенду (очікує `{ product, unit_price }`, а бекенд повертає інше)
2. `handleAddKit` — додає запчастини по одній в циклі, хоча є готовий `apply-kit` ендпоінт
3. Таблиця в модалці не відображає дані (колонки не відповідають структурі)

---

## Що повертає бекенд

### `GET /api/maintenance-kits/?truck={truckId}`

```json
[
  {
    "id": 1,
    "truck": { "id": 5, "license_plate": "AA1234BB" },
    "oil": { "id": 12, "name": "Shell Helix Ultra 5W-30 5L", "sku_code": "SHU5W30", "selling_price": "850.00" },
    "oil_quantity": "5.00",
    "filters": [
      {
        "id": 1,
        "part": { "id": 34, "name": "Фільтр оливи Iveco Daily", "sku_code": "FO-001", "selling_price": "320.00" },
        "quantity": 1,
        "filter_type": { "id": 2, "name": "Оливний фільтр" }
      },
      {
        "id": 2,
        "part": { "id": 41, "name": "Фільтр повітряний", "sku_code": "FA-002", "selling_price": "280.00" },
        "quantity": 1,
        "filter_type": null
      }
    ]
  }
]
```

Якщо набір не знайдено — порожній масив `[]`.

### `POST /api/service-works/{workId}/apply-kit/`

Відповідь при успіху:
```json
{
  "count": 3,
  "added": [
    { "name": "Shell Helix Ultra 5W-30 5L", "quantity": "5.00", "type": "oil" },
    { "name": "Фільтр оливи Iveco Daily", "quantity": 1, "type": "filter" },
    { "name": "Фільтр повітряний", "quantity": 1, "type": "filter" }
  ]
}
```

Відповідь при відсутності набору (404):
```json
{ "error": "Набір ТО для AA1234BB не знайдено. Спочатку збережіть набір." }
```

---

## Зміна 1 — `src/api/index.js`

Додати метод `applyKit` до `ordersAPI`:

```js
export const ordersAPI = {
  // ... існуючі методи ...
  applyKit: (workId) => instance.post(`/service-works/${workId}/apply-kit/`),
};
```

---

## Зміна 2 — `src/pages/orders/OrderDetailPage.jsx`

### 2.1 Стан: замінити `kitItems` на `kitData`

Замінити:
```js
const [kitItems, setKitItems] = useState([]);
```
На:
```js
const [kitData, setKitData] = useState(null); // { oil, oil_quantity, filters }
```

### 2.2 Виправити `handleOpenKitModal`

Поточний код (неправильний):
```js
const handleOpenKitModal = async () => {
  const truckId = order?.truck?.id || order?.truck;
  if (!truckId) return message.warning('Авто не визначено');
  setKitLoading(true);
  setIsKitModalOpen(true);
  try {
    const res = await maintenanceAPI.getKit(truckId);
    const data = res.data || res;
    setKitItems(Array.isArray(data) ? data : (data.items || data.results || []));
  } catch {
    message.error('Не вдалося завантажити набір ТО');
    setIsKitModalOpen(false);
  } finally {
    setKitLoading(false);
  }
};
```

Замінити на:
```js
const handleOpenKitModal = async () => {
  const truckId = order?.truck?.id || order?.truck;
  if (!truckId) return message.warning('Авто не визначено');
  setKitLoading(true);
  setIsKitModalOpen(true);
  try {
    const res = await maintenanceAPI.getKit(truckId);
    const data = res.data || res;
    const list = Array.isArray(data) ? data : (data.results || []);
    if (list.length === 0) {
      setKitData(null);
    } else {
      setKitData(list[0]); // беремо перший (і єдиний) набір для авто
    }
  } catch {
    message.error('Не вдалося завантажити набір ТО');
    setIsKitModalOpen(false);
  } finally {
    setKitLoading(false);
  }
};
```

### 2.3 Виправити `handleAddKit`

Поточний код (неправильний — додає по одній запчастині в циклі):
```js
const handleAddKit = async () => {
  if (!kitWorkId) return message.warning('Оберіть роботу');
  setModalLoading(true);
  try {
    for (const item of kitItems) {
      const productId = item.product?.id || item.id;
      const qty = item.quantity ?? 1;
      const price = item.unit_price ?? item.product?.selling_price ?? 0;
      await ordersAPI.addPartToWork(kitWorkId, {
        part: productId,
        quantity: qty,
        unit_price: price,
      });
    }
    message.success('Набір ТО додано');
    setIsKitModalOpen(false);
    setKitWorkId(null);
    initPage();
  } catch (error) {
    const msg = error.response?.data?.error || error.response?.data?.detail || 'Помилка при додаванні набору';
    message.error(msg);
  } finally {
    setModalLoading(false);
  }
};
```

Замінити на:
```js
const handleAddKit = async () => {
  if (!kitWorkId) return message.warning('Оберіть роботу');
  setModalLoading(true);
  try {
    const res = await ordersAPI.applyKit(kitWorkId);
    const data = res.data || res;
    message.success(`Набір ТО додано: ${data.count} позиції`);
    setIsKitModalOpen(false);
    setKitWorkId(null);
    setKitData(null);
    initPage();
  } catch (error) {
    const msg = error.response?.data?.error || error.response?.data?.detail || 'Помилка при додаванні набору';
    message.error(msg);
  } finally {
    setModalLoading(false);
  }
};
```

### 2.4 Виправити таблицю в модалці набору ТО

Побудувати `tableData` з `kitData` для відображення. Замінити вміст модалки "Набір ТО для авто":

```jsx
{/* Модалка набору ТО */}
<Modal
  title="Набір ТО для авто"
  open={isKitModalOpen}
  onCancel={() => { setIsKitModalOpen(false); setKitWorkId(null); setKitData(null); }}
  footer={null}
  destroyOnClose
  width={520}
>
  <Form layout="vertical">
    <Form.Item label="До якої роботи списати?" required>
      <Select
        placeholder="Оберіть роботу"
        value={kitWorkId}
        onChange={setKitWorkId}
        options={orderWorks.map(w => ({ value: w.id, label: w.work?.name || w.description || `Робота #${w.id}` }))}
      />
    </Form.Item>
  </Form>

  {kitLoading ? (
    <LoadingSpinner />
  ) : kitData === null ? (
    <Alert
      message="Набір ТО не знайдено"
      description="Для цього авто ще не збережено набір ТО. Додайте оливу та фільтри вручну — вони збережуться автоматично."
      type="warning"
      showIcon
      style={{ marginBottom: 16 }}
    />
  ) : (
    <Table
      dataSource={[
        ...(kitData.oil ? [{
          key: 'oil',
          name: kitData.oil.name,
          sku: kitData.oil.sku_code,
          quantity: kitData.oil_quantity,
          type: 'Олива',
        }] : []),
        ...(kitData.filters || []).map(f => ({
          key: `filter-${f.id}`,
          name: f.part?.name,
          sku: f.part?.sku_code,
          quantity: f.quantity,
          type: f.filter_type?.name || 'Фільтр',
        })),
      ]}
      pagination={false}
      size="small"
      locale={{ emptyText: 'Набір порожній' }}
      columns={[
        { title: 'Назва', dataIndex: 'name', key: 'name' },
        { title: 'Артикул', dataIndex: 'sku', key: 'sku', width: 100 },
        { title: 'Тип', dataIndex: 'type', key: 'type', width: 100 },
        { title: 'К-сть', dataIndex: 'quantity', key: 'quantity', width: 70 },
      ]}
    />
  )}

  <Button
    type="primary"
    block
    style={{ marginTop: 16 }}
    loading={modalLoading}
    disabled={!kitWorkId || kitData === null}
    onClick={handleAddKit}
  >
    Списати весь набір
  </Button>
</Modal>
```

---

## Підсумок змін

| Файл | Що змінити |
|------|-----------|
| `src/api/index.js` | Додати `applyKit` до `ordersAPI` |
| `OrderDetailPage.jsx` | `kitItems` → `kitData` (стан); виправити `handleOpenKitModal`; замінити `handleAddKit` на виклик `applyKit`; виправити таблицю в модалці |

## Умова для автозбереження (для адміна)

Щоб **автозбереження** набору при першому ТО спрацювало, адмін повинен в Django Admin налаштувати:
- Категорія оливи: поле `category_type` = `oil` (або `олива`)
- Назва роботи або групи містить одне з: `ТО`, `т.о.`, `заміна оливи`, `заміна масла`, `регламент`, `технічне обслуговування`

import React, { useState, useEffect } from 'react';
import {
  Table, Button, Space, Input, Select, Modal, Form, InputNumber,
  Tag, message, Tooltip, Typography, Alert, Divider,
} from 'antd';
import {
  PlusOutlined, SwapOutlined, SearchOutlined, InboxOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { inventoryAPI } from '../../api';

const { Text } = Typography;

function WholesaleTab() {
  const [warehouses, setWarehouses] = useState([]);
  const [stock, setStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  // Пошук товарів через API (без завантаження всього списку)
  const [productOptions, setProductOptions] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState(undefined);

  // Receive modal
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveForm] = Form.useForm();
  const [receiveSaving, setReceiveSaving] = useState(false);

  // Transfer modal
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm] = Form.useForm();
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferRecord, setTransferRecord] = useState(null);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  // Завантажуємо залишки при зміні складу
  useEffect(() => {
    if (selectedWarehouse !== undefined) {
      fetchStock(selectedWarehouse);
    }
  }, [selectedWarehouse]);

  const fetchWarehouses = async () => {
    try {
      const res = await inventoryAPI.getWarehouses();
      const data = (res.data || res).results || (res.data || res) || [];
      setWarehouses(data);
      const wholesale = data.filter(w => w.warehouse_type === 'wholesale');
      if (wholesale.length > 0) {
        setSelectedWarehouse(wholesale[0].id);
      } else {
        setSelectedWarehouse(null);
      }
    } catch {
      message.error('Не вдалося завантажити склади');
      setSelectedWarehouse(null);
    }
  };

  const searchProducts = async (query) => {
    if (!query || query.length < 2) {
      setProductOptions([]);
      return;
    }
    setProductsLoading(true);
    try {
      const res = await inventoryAPI.getAll({ search: query, page_size: 50, ordering: 'name' });
      const data = (res.data || res).results || (res.data || res) || [];
      setProductOptions(data.map(p => ({
        value: p.id,
        label: `${p.name}${p.brand ? ` (${p.brand})` : ''} [${p.sku_code}]`,
      })));
    } catch {
      // тихо
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchStock = async (warehouseId) => {
    setStockLoading(true);
    try {
      const params = warehouseId ? { warehouse: warehouseId } : {};
      const res = await inventoryAPI.getStock(params);
      const data = (res.data || res).results || (res.data || res) || [];
      setStock(data);
    } catch {
      message.error('Не вдалося завантажити залишки');
    } finally {
      setStockLoading(false);
    }
  };

  const warehouseOptions = warehouses.map(w => ({
    value: w.id,
    label: w.name,
    type: w.warehouse_type,
  }));

  const filteredStock = stock.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (item.product_name || '').toLowerCase().includes(q) ||
      (item.product_sku || '').toLowerCase().includes(q)
    );
  });

  // --- Receive stock ---
  const openReceive = () => {
    receiveForm.resetFields();
    setProductOptions([]);
    if (selectedWarehouse) {
      receiveForm.setFieldsValue({ warehouse: selectedWarehouse });
    }
    setReceiveOpen(true);
  };

  const saveReceive = async () => {
    const values = await receiveForm.validateFields();
    setReceiveSaving(true);
    try {
      await inventoryAPI.receiveStock(values);
      message.success('Надходження зареєстровано');
      setReceiveOpen(false);
      fetchStock(selectedWarehouse);
    } catch (err) {
      const errMsg = err?.response?.data?.error || 'Помилка реєстрації надходження';
      message.error(errMsg);
    } finally {
      setReceiveSaving(false);
    }
  };

  // --- Transfer ---
  const openTransfer = (record) => {
    transferForm.resetFields();
    setProductOptions([]);
    setTransferRecord(record || null);
    if (record) {
      transferForm.setFieldsValue({
        product: record.product,
        warehouse_from: record.warehouse,
      });
    } else if (selectedWarehouse) {
      transferForm.setFieldsValue({ warehouse_from: selectedWarehouse });
    }
    setTransferOpen(true);
  };

  const saveTransfer = async () => {
    const values = await transferForm.validateFields();
    setTransferSaving(true);
    try {
      await inventoryAPI.transferStock(values);
      message.success('Товар переміщено');
      setTransferOpen(false);
      fetchStock(selectedWarehouse);
    } catch (err) {
      const errMsg = err?.response?.data?.error || 'Помилка переміщення';
      message.error(errMsg);
    } finally {
      setTransferSaving(false);
    }
  };

  const columns = [
    {
      title: 'Артикул',
      dataIndex: 'product_sku',
      key: 'sku',
      width: 120,
      render: (v) => <Text code style={{ fontSize: 12 }}>{v || '—'}</Text>,
    },
    {
      title: 'Назва',
      dataIndex: 'product_name',
      key: 'name',
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: 'Залишок',
      key: 'qty',
      width: 130,
      render: (_, r) => {
        const qty = Number(r.quantity) || 0;
        const color = qty <= 0 ? 'red' : qty < 5 ? 'orange' : 'green';
        return (
          <Tag color={color}>
            {qty > 0 ? `${qty} ${r.product_unit || 'шт'}` : 'Немає'}
          </Tag>
        );
      },
    },
    {
      title: 'Зарезервовано',
      dataIndex: 'reserved',
      key: 'reserved',
      width: 130,
      render: (v, r) => v > 0
        ? <Tag color="blue">{v} {r.product_unit || 'шт'}</Tag>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Доступно',
      key: 'available',
      width: 120,
      render: (_, r) => {
        const avail = Number(r.available) || 0;
        return avail > 0
          ? <Text strong style={{ color: '#52c41a' }}>{avail} {r.product_unit || 'шт'}</Text>
          : <Text type="secondary">0</Text>;
      },
    },
    {
      title: 'Місце',
      dataIndex: 'location',
      key: 'location',
      width: 100,
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Дії',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Tooltip title="Перемістити на інший склад">
          <Button
            size="small"
            icon={<SwapOutlined />}
            onClick={() => openTransfer(record)}
            disabled={Number(record.quantity) <= 0}
          >
            Перемістити
          </Button>
        </Tooltip>
      ),
    },
  ];

  const hasNoWholesale = selectedWarehouse === null;

  const WarehouseSelect = ({ disabled }) => (
    <Select
      style={{ width: '100%' }}
      placeholder="Оберіть склад"
      disabled={disabled}
      options={warehouseOptions}
      optionRender={(opt) => (
        <Space>
          {opt.data.label}
          <Tag color={opt.data.type === 'wholesale' ? 'purple' : 'blue'} style={{ marginLeft: 4 }}>
            {opt.data.type === 'wholesale' ? 'Оптовий' : 'Роздрібний'}
          </Tag>
        </Space>
      )}
    />
  );

  return (
    <div>
      {hasNoWholesale && (
        <Alert
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          message='Оптовий склад не налаштовано'
          description='Створіть склад з типом "Оптовий" у налаштуваннях, або зробіть надходження на будь-який склад нижче.'
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <Select
            style={{ minWidth: 220 }}
            placeholder="Оберіть склад"
            value={selectedWarehouse}
            onChange={setSelectedWarehouse}
            allowClear
            options={warehouseOptions}
            optionRender={(opt) => (
              <Space>
                {opt.data.label}
                <Tag color={opt.data.type === 'wholesale' ? 'purple' : 'blue'}>
                  {opt.data.type === 'wholesale' ? 'Оптовий' : 'Роздрібний'}
                </Tag>
              </Space>
            )}
          />
          <Input
            placeholder="Пошук за назвою або артикулом..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />
        </Space>
        <Space>
          <Button icon={<SwapOutlined />} onClick={() => openTransfer(null)}>
            Перемістити
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openReceive}>
            Надходження
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredStock}
        rowKey="id"
        loading={stockLoading}
        size="middle"
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: selectedWarehouse ? 'На цьому складі товарів немає' : 'Оберіть склад' }}
        pagination={{ pageSize: 30, showSizeChanger: false, showTotal: (t, r) => `${r[0]}–${r[1]} з ${t}` }}
      />

      {/* Надходження */}
      <Modal
        title={<><InboxOutlined style={{ color: '#f5c518', marginRight: 8 }} />Надходження товару</>}
        open={receiveOpen}
        onOk={saveReceive}
        onCancel={() => setReceiveOpen(false)}
        confirmLoading={receiveSaving}
        okText="Зберегти"
        cancelText="Скасувати"
        width={520}
      >
        <Form form={receiveForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="warehouse" label="Склад" rules={[{ required: true, message: 'Оберіть склад' }]}>
            <WarehouseSelect />
          </Form.Item>
          <Form.Item name="product" label="Товар" rules={[{ required: true, message: 'Оберіть товар' }]}>
            <Select
              showSearch
              loading={productsLoading}
              placeholder="Введіть назву або артикул (мін. 2 символи)..."
              filterOption={false}
              onSearch={searchProducts}
              options={productOptions}
              notFoundContent={productsLoading ? 'Пошук...' : 'Нічого не знайдено'}
            />
          </Form.Item>
          <Form.Item name="quantity" label="Кількість" rules={[{ required: true, message: 'Введіть кількість' }]}>
            <InputNumber min={0.01} step={1} style={{ width: '100%' }} placeholder="1" />
          </Form.Item>
          <Divider style={{ margin: '12px 0' }} />
          <Form.Item name="supplier" label="Постачальник">
            <Input placeholder="Назва постачальника" />
          </Form.Item>
          <Form.Item name="invoice_number" label="Номер накладної">
            <Input placeholder="№ накладної" />
          </Form.Item>
          <Form.Item name="purchase_price" label="Закупівельна ціна (за од.)">
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
          <Form.Item name="notes" label="Примітки">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Переміщення */}
      <Modal
        title={<><SwapOutlined style={{ color: '#f5c518', marginRight: 8 }} />Переміщення товару</>}
        open={transferOpen}
        onOk={saveTransfer}
        onCancel={() => setTransferOpen(false)}
        confirmLoading={transferSaving}
        okText="Перемістити"
        cancelText="Скасувати"
        width={520}
      >
        <Form form={transferForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="product" label="Товар" rules={[{ required: true, message: 'Оберіть товар' }]}>
            <Select
              showSearch
              loading={productsLoading}
              placeholder="Введіть назву або артикул (мін. 2 символи)..."
              filterOption={false}
              onSearch={searchProducts}
              options={productOptions}
              disabled={!!transferRecord}
              notFoundContent={productsLoading ? 'Пошук...' : 'Нічого не знайдено'}
            />
          </Form.Item>
          <Form.Item name="warehouse_from" label="Звідки" rules={[{ required: true, message: 'Оберіть склад-джерело' }]}>
            <WarehouseSelect disabled={!!transferRecord} />
          </Form.Item>
          <Form.Item name="warehouse_to" label="Куди" rules={[{ required: true, message: 'Оберіть склад призначення' }]}>
            <WarehouseSelect />
          </Form.Item>
          <Form.Item name="quantity" label="Кількість" rules={[{ required: true, message: 'Введіть кількість' }]}>
            <InputNumber min={0.01} step={1} style={{ width: '100%' }} placeholder="1" />
          </Form.Item>
          <Form.Item name="notes" label="Примітки">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default WholesaleTab;

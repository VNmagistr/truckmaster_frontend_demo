import React, { useState, useEffect, useCallback } from 'react';
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
  const [wholesaleWarehouses, setWholesaleWarehouses] = useState([]);
  const [retailWarehouses, setRetailWarehouses] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  // Receive modal
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveForm] = Form.useForm();
  const [receiveSaving, setReceiveSaving] = useState(false);

  // Transfer modal
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm] = Form.useForm();
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferRecord, setTransferRecord] = useState(null); // pre-fill from row

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouse !== undefined) {
      fetchStock();
    }
  }, [selectedWarehouse]);

  const fetchWarehouses = async () => {
    try {
      const res = await inventoryAPI.getWarehouses();
      const data = (res.data || res).results || (res.data || res) || [];
      setWarehouses(data);
      const wholesale = data.filter(w => w.warehouse_type === 'wholesale');
      const retail = data.filter(w => w.warehouse_type === 'retail' || w.is_default);
      setWholesaleWarehouses(wholesale);
      setRetailWarehouses(retail);
      if (wholesale.length > 0) {
        setSelectedWarehouse(wholesale[0].id);
      } else {
        setSelectedWarehouse(null);
        setLoading(false);
      }
    } catch {
      message.error('Не вдалося завантажити склади');
      setLoading(false);
    }
  };

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedWarehouse) params.warehouse = selectedWarehouse;
      const [stockRes, productsRes] = await Promise.all([
        inventoryAPI.getStock(params),
        inventoryAPI.getAll({ page_size: 1000, ordering: 'name' }),
      ]);
      const stockData = (stockRes.data || stockRes).results || (stockRes.data || stockRes) || [];
      const productsData = (productsRes.data || productsRes).results || (productsRes.data || productsRes) || [];
      setStock(stockData);
      setProducts(productsData);
    } catch {
      message.error('Не вдалося завантажити залишки');
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse]);

  useEffect(() => {
    if (selectedWarehouse !== undefined && selectedWarehouse !== null) {
      fetchStock();
    }
  }, [fetchStock]);

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
      fetchStock();
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
      fetchStock();
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

  const hasNoWholesale = wholesaleWarehouses.length === 0;

  return (
    <div>
      {hasNoWholesale && (
        <Alert
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          message='Оптовий склад не налаштовано'
          description='Створіть склад з типом "Оптовий" у налаштуваннях, або додайте надходження на будь-який склад нижче.'
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <Select
            style={{ minWidth: 200 }}
            placeholder="Оберіть склад"
            value={selectedWarehouse}
            onChange={setSelectedWarehouse}
            allowClear
          >
            {warehouses.map(w => (
              <Select.Option key={w.id} value={w.id}>
                {w.name}
                {' '}
                <Tag style={{ marginLeft: 4 }} color={w.warehouse_type === 'wholesale' ? 'purple' : w.warehouse_type === 'retail' ? 'blue' : 'default'}>
                  {w.warehouse_type === 'wholesale' ? 'Оптовий' : w.warehouse_type === 'retail' ? 'Роздрібний' : 'Інший'}
                </Tag>
              </Select.Option>
            ))}
          </Select>
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
        loading={loading}
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
            <Select placeholder="Оберіть склад">
              {warehouses.map(w => (
                <Select.Option key={w.id} value={w.id}>
                  {w.name}{' '}
                  <Tag color={w.warehouse_type === 'wholesale' ? 'purple' : 'blue'} style={{ marginLeft: 4 }}>
                    {w.warehouse_type === 'wholesale' ? 'Оптовий' : 'Роздрібний'}
                  </Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="product" label="Товар" rules={[{ required: true, message: 'Оберіть товар' }]}>
            <Select
              showSearch
              placeholder="Назва або артикул..."
              optionFilterProp="label"
              options={products.map(p => ({
                value: p.id,
                label: `${p.name}${p.brand ? ` (${p.brand})` : ''}${p.sku_code ? ` [${p.sku_code}]` : ''}`,
              }))}
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
              placeholder="Назва або артикул..."
              optionFilterProp="label"
              disabled={!!transferRecord}
              options={products.map(p => ({
                value: p.id,
                label: `${p.name}${p.brand ? ` (${p.brand})` : ''}${p.sku_code ? ` [${p.sku_code}]` : ''}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="warehouse_from" label="Звідки" rules={[{ required: true, message: 'Оберіть склад-джерело' }]}>
            <Select placeholder="Склад-джерело" disabled={!!transferRecord}>
              {warehouses.map(w => (
                <Select.Option key={w.id} value={w.id}>
                  {w.name}{' '}
                  <Tag color={w.warehouse_type === 'wholesale' ? 'purple' : 'blue'} style={{ marginLeft: 4 }}>
                    {w.warehouse_type === 'wholesale' ? 'Оптовий' : 'Роздрібний'}
                  </Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="warehouse_to" label="Куди" rules={[{ required: true, message: 'Оберіть склад призначення' }]}>
            <Select placeholder="Склад призначення">
              {warehouses.map(w => (
                <Select.Option key={w.id} value={w.id}>
                  {w.name}{' '}
                  <Tag color={w.warehouse_type === 'wholesale' ? 'purple' : 'blue'} style={{ marginLeft: 4 }}>
                    {w.warehouse_type === 'wholesale' ? 'Оптовий' : 'Роздрібний'}
                  </Tag>
                </Select.Option>
              ))}
            </Select>
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

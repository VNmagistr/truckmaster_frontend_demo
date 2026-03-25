import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Descriptions, Button, Table, Tag, Space, Form, Input,
  Select, InputNumber, Modal, message, Popconfirm, Typography,
  Divider, Row, Col, Spin, AutoComplete, Alert,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined,
  SendOutlined, CheckCircleOutlined, StopOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components';
import { clientsAPI, trucksAPI, inventoryAPI } from '../../api';
import {
  getInvoice, createInvoice, updateInvoice,
  markSent, markPaid, cancelInvoice,
  getItems, createItem, updateItem, deleteItem,
  trackDeclaration,
} from '../../api/invoices';

const Y   = '#f5c518';
const INK = '#1a1a1a';
const { Text } = Typography;

const STATUS_COLOR = { draft: 'default', sent: 'blue', paid: 'green', cancelled: 'red' };
const STATUS_LABEL = { draft: 'Чернетка', sent: 'Виставлено', paid: 'Оплачено', cancelled: 'Скасовано' };

// ─── Форма шапки рахунку ─────────────────────────────────────────────────────

function InvoiceHeaderForm({ invoice, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientOptions, setClientOptions] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [truckOptions, setTruckOptions] = useState([]);

  useEffect(() => {
    if (invoice) {
      form.setFieldsValue({
        client: invoice.client,
        truck: invoice.truck,
        notes: invoice.notes,
      });
      setSelectedClientId(invoice.client);
      if (invoice.client_name) {
        setClientOptions([{
          value: invoice.client,
          label: `${invoice.client_name} (${invoice.client_phone || '—'})`,
        }]);
      }
      if (invoice.client) loadTrucks(invoice.client);
    }
  }, [invoice?.id]);

  const searchClients = async (val) => {
    if (!val || val.length < 2) return;
    try {
      const res = await clientsAPI.getAll({ search: val, page_size: 20 });
      const list = res.data?.results || res.data || [];
      setClientOptions(list.map(c => ({ value: c.id, label: `${c.name} (${c.phone || '—'})` })));
    } catch {}
  };

  const loadTrucks = async (clientId) => {
    try {
      const res = await trucksAPI.getAll({ client: clientId, page_size: 100 });
      const list = res.data?.results || res.data || [];
      setTruckOptions(list.map(t => ({ value: t.id, label: `${t.license_plate} — ${t.specific_model_name || ''}` })));
    } catch {}
  };

  const handleClientSelect = (id) => {
    setSelectedClientId(id);
    form.setFieldValue('truck', undefined);
    setTruckOptions([]);
    loadTrucks(id);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await updateInvoice(invoice.id, values);
      message.success('Збережено');
      onSaved();
    } catch (err) {
      if (err?.response?.data) {
        message.error(Object.values(err.response.data).flat().join(' '));
      }
    } finally {
      setSaving(false);
    }
  };

  const readonly = !['draft'].includes(invoice?.status);

  return (
    <Form form={form} layout="vertical">
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name="client" label="Клієнт" rules={[{ required: true, message: 'Оберіть клієнта' }]}>
            <Select
              showSearch
              disabled={readonly}
              placeholder="Введіть ім'я або телефон"
              filterOption={false}
              onSearch={searchClients}
              onSelect={handleClientSelect}
              options={clientOptions}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="truck" label="Вантажівка">
            <Select
              disabled={readonly || !selectedClientId}
              allowClear
              placeholder="Оберіть вантажівку (необов'язково)"
              options={truckOptions}
            />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item name="notes" label="Примітки">
            <Input.TextArea rows={2} disabled={readonly} maxLength={500} />
          </Form.Item>
        </Col>
      </Row>
      {!readonly && (
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}
          style={{ background: Y, color: INK, borderColor: Y }}>
          Зберегти
        </Button>
      )}
    </Form>
  );
}

// ─── Позиції рахунку ─────────────────────────────────────────────────────────

function ItemsTable({ invoiceId, invoiceStatus, onTotalChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');

  const readonly = !['draft'].includes(invoiceStatus);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getItems(invoiceId);
      const list = res.data?.results ?? res.data ?? [];
      setItems(list);
      const total = list.reduce((s, i) => s + parseFloat(i.total || 0), 0);
      onTotalChange(total);
    } catch {
      message.error('Не вдалося завантажити позиції');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => { load(); }, [invoiceId]);

  const searchProducts = async (val) => {
    if (!val || val.length < 2) return;
    try {
      const res = await inventoryAPI.getAll({ search: val, page_size: 30 });
      const list = res.data?.results || res.data || [];
      setProducts(list);
    } catch {}
  };

  const openAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    form.setFieldsValue({
      product: item.product,
      description: item.description,
      quantity: parseFloat(item.quantity),
      unit_price: parseFloat(item.unit_price),
    });
    setModalOpen(true);
  };

  const handleProductSelect = (productId) => {
    const p = products.find(x => x.id === productId);
    if (p) {
      form.setFieldsValue({
        description: p.name,
        unit_price: parseFloat(p.selling_price || 0),
      });
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values, invoice: invoiceId };
      if (editingItem) {
        await updateItem(editingItem.id, payload);
        message.success('Оновлено');
      } else {
        await createItem(payload);
        message.success('Позицію додано');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      if (err?.response?.data) {
        message.error(Object.values(err.response.data).flat().join(' '));
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteItem(id);
      message.success('Видалено');
      load();
    } catch { message.error('Помилка'); }
  };

  const total = items.reduce((s, i) => s + parseFloat(i.total || 0), 0);

  const columns = [
    {
      title: 'Артикул',
      dataIndex: 'product_sku',
      key: 'sku',
      width: 110,
      render: v => v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : '—',
    },
    {
      title: 'Опис / Назва',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'К-сть',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right',
      render: v => parseFloat(v),
    },
    {
      title: 'Ціна',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 110,
      align: 'right',
      render: v => `${parseFloat(v).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴`,
    },
    {
      title: 'Сума',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right',
      render: v => <strong>{parseFloat(v).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>,
    },
    ...(!readonly ? [{
      title: '',
      key: 'actions',
      width: 80,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="Видалити позицію?" onConfirm={() => handleDelete(row.id)} okText="Так" cancelText="Ні">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  return (
    <>
      {!readonly && (
        <div style={{ marginBottom: 12 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}
            style={{ background: Y, color: INK, borderColor: Y }}>
            Додати позицію
          </Button>
        </div>
      )}

      <Spin spinning={loading}>
        <Table
          rowKey="id"
          dataSource={items}
          columns={columns}
          pagination={false}
          size="small"
          scroll={{ x: 600 }}
          locale={{ emptyText: 'Немає позицій' }}
          footer={() => (
            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 16 }}>
              Разом: {total.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
            </div>
          )}
        />
      </Spin>

      <Modal
        title={editingItem ? 'Редагувати позицію' : 'Додати позицію'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="Зберегти"
        cancelText="Скасувати"
        okButtonProps={{ style: { background: Y, color: INK, borderColor: Y } }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="product" label="Товар зі складу">
            <Select
              showSearch
              allowClear
              placeholder="Пошук за назвою або артикулом"
              filterOption={false}
              onSearch={searchProducts}
              onSelect={handleProductSelect}
              options={products.map(p => ({
                value: p.id,
                label: `${p.sku_code ? p.sku_code + ' — ' : ''}${p.name}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="description" label="Опис" rules={[{ required: true, message: 'Введіть опис' }]}>
            <Input placeholder="Назва товару або послуги" maxLength={255} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="quantity" label="Кількість" initialValue={1} rules={[{ required: true }]}>
                <InputNumber min={0.01} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unit_price" label="Ціна за одиницю" rules={[{ required: true }]}>
                <InputNumber min={0} step={10} style={{ width: '100%' }} addonAfter="₴" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}

// ─── Головна сторінка ─────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [liveTotal, setLiveTotal] = useState(0);
  const [declaration, setDeclaration] = useState('');
  const [savingDeclaration, setSavingDeclaration] = useState(false);
  const [trackingResult, setTrackingResult] = useState(null);
  const [tracking, setTracking] = useState(false);

  // Стан для форми нового рахунку
  const [newForm] = Form.useForm();
  const [clientOptions, setClientOptions] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [truckOptions, setTruckOptions] = useState([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInvoice(id);
      setInvoice(res.data);
      setLiveTotal(parseFloat(res.data.total || 0));
      setDeclaration(res.data.nova_poshta_declaration || '');
    } catch {
      message.error('Рахунок не знайдено');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isNew) load();
  }, [id]);

  // Автоматично завантажуємо статус НП при відкритті/оновленні рахунку
  useEffect(() => {
    if (invoice?.nova_poshta_declaration) {
      handleTrack(invoice.nova_poshta_declaration);
    }
  }, [invoice?.nova_poshta_declaration]);

  const searchClients = async (val) => {
    if (!val || val.length < 2) return;
    try {
      const res = await clientsAPI.getAll({ search: val, page_size: 20 });
      setClientOptions((res.data?.results || res.data || []).map(c => ({
        value: c.id,
        label: `${c.name} (${c.phone || '—'})`,
      })));
    } catch {}
  };

  const loadTrucks = async (clientId) => {
    try {
      const res = await trucksAPI.getAll({ client: clientId, page_size: 100 });
      setTruckOptions((res.data?.results || res.data || []).map(t => ({
        value: t.id,
        label: `${t.license_plate} — ${t.specific_model_name || ''}`,
      })));
    } catch {}
  };

  const handleCreate = async () => {
    try {
      const values = await newForm.validateFields();
      setCreating(true);
      const res = await createInvoice(values);
      message.success(`Рахунок ${res.data.number} створено`);
      navigate(`/invoices/${res.data.id}`);
    } catch (err) {
      if (err?.response?.data) {
        message.error(Object.values(err.response.data).flat().join(' '));
      }
    } finally {
      setCreating(false);
    }
  };

  const handleSaveDeclaration = async () => {
    if (declaration && !/^\d{14}$/.test(declaration)) {
      message.error('Номер декларації має містити рівно 14 цифр');
      return;
    }
    setSavingDeclaration(true);
    try {
      const res = await updateInvoice(invoice.id, { nova_poshta_declaration: declaration || null });
      setInvoice(res.data);
      setTrackingResult(null);
      message.success('Збережено');
    } catch {
      message.error('Не вдалося зберегти');
    } finally {
      setSavingDeclaration(false);
    }
  };

  const handleTrack = async (explicitNum) => {
    const num = explicitNum ?? invoice?.nova_poshta_declaration;
    if (!num) return;
    setTracking(true);
    setTrackingResult(null);
    try {
      const res = await trackDeclaration(num);
      setTrackingResult({ ok: true, data: res.data });
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Не вдалося отримати статус';
      setTrackingResult({ ok: false, message: detail });
    } finally {
      setTracking(false);
    }
  };

  const handleAction = async (action, label) => {
    try {
      const res = await action(invoice.id);
      setInvoice(res.data);
      message.success(label);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Помилка';
      message.error(msg);
    }
  };

  // ── Сторінка створення ────────────────────────────────────────────────────
  if (isNew) {
    return (
      <div style={{ paddingBottom: 24 }}>
        <PageHeader title="Новий рахунок" showBack extra={
          <Button onClick={() => navigate('/invoices')} icon={<ArrowLeftOutlined />}>Назад</Button>
        } />
        <Card style={{ borderTop: `4px solid ${Y}` }}>
          <Form form={newForm} layout="vertical">
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="client" label="Клієнт" rules={[{ required: true, message: 'Оберіть клієнта' }]}>
                  <Select
                    showSearch filterOption={false}
                    placeholder="Введіть ім'я або телефон"
                    onSearch={searchClients}
                    onSelect={(id) => { setSelectedClientId(id); newForm.setFieldValue('truck', undefined); loadTrucks(id); }}
                    options={clientOptions}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="truck" label="Вантажівка">
                  <Select allowClear placeholder="Необов'язково" options={truckOptions} disabled={!selectedClientId} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="notes" label="Примітки">
                  <Input.TextArea rows={2} maxLength={500} />
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} loading={creating}
              style={{ background: Y, color: INK, borderColor: Y, fontWeight: 600 }}>
              Створити рахунок
            </Button>
          </Form>
        </Card>
      </div>
    );
  }

  // ── Детальна сторінка ─────────────────────────────────────────────────────
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>;
  if (!invoice) return null;

  const canSend   = invoice.status === 'draft';
  const canPay    = ['draft', 'sent'].includes(invoice.status);
  const canCancel = !['paid', 'cancelled'].includes(invoice.status);

  return (
    <div style={{ paddingBottom: 24 }}>
      <PageHeader
        title={invoice.number}
        subtitle={
          <Space>
            <Tag color={STATUS_COLOR[invoice.status]} style={{ fontSize: 14 }}>
              {STATUS_LABEL[invoice.status]}
            </Tag>
            <span style={{ color: '#888' }}>{dayjs(invoice.date).format('DD.MM.YYYY')}</span>
          </Space>
        }
        showBack
        extra={
          <Space wrap>
            {canSend && (
              <Button icon={<SendOutlined />} onClick={() => handleAction(markSent, 'Виставлено')}>
                Виставити
              </Button>
            )}
            {canPay && (
              <Button icon={<CheckCircleOutlined />} style={{ color: 'green', borderColor: 'green' }}
                onClick={() => handleAction(markPaid, 'Оплачено — запчастини списано зі складу')}>
                Оплачено
              </Button>
            )}
            {canCancel && (
              <Popconfirm title="Скасувати рахунок?" onConfirm={() => handleAction(cancelInvoice, 'Скасовано')} okText="Так" cancelText="Ні">
                <Button danger icon={<StopOutlined />}>Скасувати</Button>
              </Popconfirm>
            )}
          </Space>
        }
      />

      {/* Шапка */}
      <Card style={{ marginBottom: 16, borderTop: `4px solid ${Y}` }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label="Клієнт">
            <strong>{invoice.client_name}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Телефон">{invoice.client_phone || '—'}</Descriptions.Item>
          <Descriptions.Item label="Вантажівка">{invoice.truck_display || '—'}</Descriptions.Item>
          <Descriptions.Item label="Тип">
            <Tag color={invoice.invoice_type === 'driver_tab' ? 'orange' : 'blue'}>
              {invoice.invoice_type_display || '—'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Сума">
            <span style={{ fontSize: 20, fontWeight: 700, color: invoice.status === 'paid' ? '#52c41a' : INK }}>
              {liveTotal.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
            </span>
          </Descriptions.Item>
          {invoice.nova_poshta_declaration && (
            <Descriptions.Item label="Декларація НП">
              <Text code>{invoice.nova_poshta_declaration}</Text>
            </Descriptions.Item>
          )}
        </Descriptions>

        {invoice.status !== 'cancelled' && invoice.invoice_type !== 'driver_tab' && (
          <>
            <Divider />
            <Space align="end" wrap>
              <div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Номер декларації НП</div>
                <Input
                  value={declaration}
                  onChange={e => { setDeclaration(e.target.value.replace(/\D/g, '').slice(0, 14)); setTrackingResult(null); }}
                  placeholder="14 цифр"
                  maxLength={14}
                  style={{ width: 180, fontFamily: 'monospace' }}
                  allowClear
                />
              </div>
              <Button
                icon={<SaveOutlined />}
                loading={savingDeclaration}
                onClick={handleSaveDeclaration}
                disabled={declaration === (invoice.nova_poshta_declaration || '')}
              >
                Зберегти
              </Button>
            </Space>

            {tracking && (
              <div style={{ marginTop: 12, color: '#888', fontSize: 13 }}>
                <Spin size="small" style={{ marginRight: 8 }} />
                Отримання статусу Нової Пошти…
              </div>
            )}

            {trackingResult && (
              <div style={{ marginTop: 12 }}>
                {trackingResult.ok ? (
                  <Alert
                    type={trackingResult.data.StatusCode === '9' ? 'success' : 'info'}
                    showIcon
                    message={trackingResult.data.Status}
                    description={
                      <Space direction="vertical" size={2} style={{ fontSize: 13 }}>
                        {trackingResult.data.CityRecipient && (
                          <span>Місто отримувача: <strong>{trackingResult.data.CityRecipient}</strong></span>
                        )}
                        {trackingResult.data.WarehouseRecipientAddress && (
                          <span>Відділення: <strong>{trackingResult.data.WarehouseRecipientAddress}</strong></span>
                        )}
                        {trackingResult.data.ScheduledDeliveryDate && (
                          <span>Очікувана доставка: <strong>{trackingResult.data.ScheduledDeliveryDate}</strong></span>
                        )}
                        {trackingResult.data.ActualDeliveryDate && (
                          <span>Дата отримання: <strong>{trackingResult.data.ActualDeliveryDate}</strong></span>
                        )}
                        {trackingResult.data.DocumentWeight && (
                          <span>Вага: <strong>{trackingResult.data.DocumentWeight} кг</strong></span>
                        )}
                        {trackingResult.data.DateScan && (
                          <span>Останнє сканування: <strong>{trackingResult.data.DateScan}</strong></span>
                        )}
                      </Space>
                    }
                  />
                ) : (
                  <Alert type="error" showIcon message={trackingResult.message} />
                )}
              </div>
            )}
          </>
        )}

        {invoice.status === 'draft' && (
          <>
            <Divider />
            <InvoiceHeaderForm invoice={invoice} onSaved={load} />
          </>
        )}

        {invoice.notes && invoice.status !== 'draft' && (
          <>
            <Divider />
            <Text type="secondary">{invoice.notes}</Text>
          </>
        )}
      </Card>

      {/* Позиції */}
      <Card style={{ borderTop: `4px solid ${Y}` }}>
        <ItemsTable
          invoiceId={invoice.id}
          invoiceStatus={invoice.status}
          onTotalChange={setLiveTotal}
        />
      </Card>
    </div>
  );
}

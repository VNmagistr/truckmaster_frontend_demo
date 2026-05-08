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
import { useTranslation } from 'react-i18next';
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
const STATUS_KEY   = { draft: 'statusDraft', sent: 'statusSent', paid: 'statusPaid', cancelled: 'statusCanceled' };

// ─── Форма шапки рахунку ─────────────────────────────────────────────────────

function InvoiceHeaderForm({ invoice, onSaved }) {
  const { t } = useTranslation();
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
      setTruckOptions(list.map(tr => ({ value: tr.id, label: `${tr.license_plate} — ${tr.specific_model_name || ''}` })));
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
      message.success(t('invoiceDetail.saved'));
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
          <Form.Item name="client" label={t('invoiceDetail.clientLabel')} rules={[{ required: true, message: t('invoiceDetail.selectClient') }]}>
            <Select
              showSearch
              disabled={readonly}
              placeholder={t('invoiceDetail.clientSearchPlaceholder')}
              filterOption={false}
              onSearch={searchClients}
              onSelect={handleClientSelect}
              options={clientOptions}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="truck" label={t('invoiceDetail.selectTruck')}>
            <Select
              disabled={readonly || !selectedClientId}
              allowClear
              placeholder={t('invoiceDetail.selectTruckOptional')}
              options={truckOptions}
            />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item name="notes" label={t('invoiceDetail.notes')}>
            <Input.TextArea rows={2} disabled={readonly} maxLength={500} />
          </Form.Item>
        </Col>
      </Row>
      {!readonly && (
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}
          style={{ background: Y, color: INK, borderColor: Y }}>
          {t('common.save')}
        </Button>
      )}
    </Form>
  );
}

// ─── Позиції рахунку ─────────────────────────────────────────────────────────

function ItemsTable({ invoiceId, invoiceStatus, onTotalChange }) {
  const { t } = useTranslation();
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
      message.error(t('invoiceDetail.loadError'));
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
        message.success(t('invoiceDetail.saved'));
      } else {
        await createItem(payload);
        message.success(t('invoiceDetail.itemAdded'));
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
      message.success(t('invoiceDetail.itemDeleted'));
      load();
    } catch { message.error(t('common.error')); }
  };

  const total = items.reduce((s, i) => s + parseFloat(i.total || 0), 0);

  const columns = [
    {
      title: t('invoiceDetail.skuColumn'),
      dataIndex: 'product_sku',
      key: 'sku',
      width: 110,
      render: v => v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : '—',
    },
    {
      title: t('invoiceDetail.descColumn'),
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: t('invoiceDetail.qtyColumn'),
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right',
      render: v => parseFloat(v),
    },
    {
      title: t('invoiceDetail.priceColumn'),
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 110,
      align: 'right',
      render: v => `${parseFloat(v).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴`,
    },
    {
      title: t('invoiceDetail.amountColumn'),
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
          <Popconfirm title={t('confirmDelete.title')} onConfirm={() => handleDelete(row.id)} okText={t('common.yes')} cancelText={t('common.no')}>
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
            {t('invoiceDetail.addItem')}
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
          locale={{ emptyText: t('invoiceDetail.noItems') }}
          footer={() => (
            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 16 }}>
              {t('invoiceDetail.totalLabel')} {total.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
            </div>
          )}
        />
      </Spin>

      <Modal
        title={editingItem ? t('invoiceDetail.editItem') : t('invoiceDetail.addItem')}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        okButtonProps={{ style: { background: Y, color: INK, borderColor: Y } }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="product" label={t('invoiceDetail.productFromStock')}>
            <Select
              showSearch
              allowClear
              placeholder={t('invoiceDetail.productSearchPlaceholder')}
              filterOption={false}
              onSearch={searchProducts}
              onSelect={handleProductSelect}
              options={products.map(p => ({
                value: p.id,
                label: `${p.sku_code ? p.sku_code + ' — ' : ''}${p.name}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')} rules={[{ required: true, message: t('invoiceDetail.descPlaceholder') }]}>
            <Input placeholder={t('invoiceDetail.descHelp')} maxLength={255} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="quantity" label={t('common.quantity')} initialValue={1} rules={[{ required: true }]}>
                <InputNumber min={0.01} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unit_price" label={t('invoiceDetail.pricePerUnit')} rules={[{ required: true }]}>
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
  const { t } = useTranslation();
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
      message.error(t('invoiceDetail.loadError'));
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
      setTruckOptions((res.data?.results || res.data || []).map(tr => ({
        value: tr.id,
        label: `${tr.license_plate} — ${tr.specific_model_name || ''}`,
      })));
    } catch {}
  };

  const handleCreate = async () => {
    try {
      const values = await newForm.validateFields();
      setCreating(true);
      const res = await createInvoice(values);
      message.success(t('invoiceDetail.invoiceCreated', { number: res.data.number }));
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
      message.error(t('invoiceDetail.npDigitsError'));
      return;
    }
    setSavingDeclaration(true);
    try {
      const res = await updateInvoice(invoice.id, { nova_poshta_declaration: declaration || null });
      setInvoice(res.data);
      setTrackingResult(null);
      message.success(t('invoiceDetail.npSaved'));
    } catch {
      message.error(t('invoiceDetail.npSaveError'));
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
      const detail = err?.response?.data?.detail || t('invoiceDetail.npTrackError');
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
      const msg = err?.response?.data?.detail || t('common.error');
      message.error(msg);
    }
  };

  // ── Сторінка створення ────────────────────────────────────────────────────
  if (isNew) {
    return (
      <div style={{ paddingBottom: 24 }}>
        <PageHeader title={t('invoiceDetail.newInvoice')} showBack extra={
          <Button onClick={() => navigate('/invoices')} icon={<ArrowLeftOutlined />}>{t('invoiceDetail.back')}</Button>
        } />
        <Card style={{ borderTop: `4px solid ${Y}` }}>
          <Form form={newForm} layout="vertical">
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="client" label={t('invoiceDetail.clientLabel')} rules={[{ required: true, message: t('invoiceDetail.selectClient') }]}>
                  <Select
                    showSearch filterOption={false}
                    placeholder={t('invoiceDetail.clientSearchPlaceholder')}
                    onSearch={searchClients}
                    onSelect={(cid) => { setSelectedClientId(cid); newForm.setFieldValue('truck', undefined); loadTrucks(cid); }}
                    options={clientOptions}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="truck" label={t('invoiceDetail.selectTruck')}>
                  <Select allowClear placeholder={t('invoiceDetail.truckOptional')} options={truckOptions} disabled={!selectedClientId} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="notes" label={t('invoiceDetail.notes')}>
                  <Input.TextArea rows={2} maxLength={500} />
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} loading={creating}
              style={{ background: Y, color: INK, borderColor: Y, fontWeight: 600 }}>
              {t('invoiceDetail.createInvoice')}
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
              {t(`invoices.${STATUS_KEY[invoice.status]}`)}
            </Tag>
            <span style={{ color: '#888' }}>{dayjs(invoice.date).format('DD.MM.YYYY')}</span>
          </Space>
        }
        showBack
        extra={
          <Space wrap>
            {canSend && (
              <Button icon={<SendOutlined />} onClick={() => handleAction(markSent, t('invoices.statusSent'))}>
                {t('invoiceDetail.markSent')}
              </Button>
            )}
            {canPay && (
              <Button icon={<CheckCircleOutlined />} style={{ color: 'green', borderColor: 'green' }}
                onClick={() => handleAction(markPaid, t('invoiceDetail.markPaid'))}>
                {t('invoices.statusPaid')}
              </Button>
            )}
            {canCancel && (
              <Popconfirm title={t('invoiceDetail.cancelConfirm')} onConfirm={() => handleAction(cancelInvoice, t('invoices.statusCanceled'))} okText={t('common.yes')} cancelText={t('common.no')}>
                <Button danger icon={<StopOutlined />}>{t('common.cancel')}</Button>
              </Popconfirm>
            )}
          </Space>
        }
      />

      {/* Шапка */}
      <Card style={{ marginBottom: 16, borderTop: `4px solid ${Y}` }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label={t('invoiceDetail.clientLabel')}>
            <strong>{invoice.client_name}</strong>
          </Descriptions.Item>
          <Descriptions.Item label={t('invoiceDetail.phoneLabel')}>{invoice.client_phone || '—'}</Descriptions.Item>
          <Descriptions.Item label={t('invoiceDetail.truckLabel')}>{invoice.truck_display || '—'}</Descriptions.Item>
          <Descriptions.Item label={t('invoiceDetail.typeLabel')}>
            <Tag color={invoice.invoice_type === 'driver_tab' ? 'orange' : 'blue'}>
              {invoice.invoice_type_display || '—'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('invoiceDetail.amountLabel')}>
            <span style={{ fontSize: 20, fontWeight: 700, color: invoice.status === 'paid' ? '#52c41a' : INK }}>
              {liveTotal.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
            </span>
          </Descriptions.Item>
          {invoice.nova_poshta_declaration && (
            <Descriptions.Item label={t('invoiceDetail.npDeclaration')}>
              <Text code>{invoice.nova_poshta_declaration}</Text>
            </Descriptions.Item>
          )}
        </Descriptions>

        {invoice.status !== 'cancelled' && invoice.invoice_type !== 'driver_tab' && (
          <>
            <Divider />
            <Space align="end" wrap>
              <div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{t('invoiceDetail.npDeclarationPlaceholder')}</div>
                <Input
                  value={declaration}
                  onChange={e => { setDeclaration(e.target.value.replace(/\D/g, '').slice(0, 14)); setTrackingResult(null); }}
                  placeholder={t('invoiceDetail.npDigits')}
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
                {t('common.save')}
              </Button>
            </Space>

            {tracking && (
              <div style={{ marginTop: 12, color: '#888', fontSize: 13 }}>
                <Spin size="small" style={{ marginRight: 8 }} />
                {t('invoiceDetail.npTrackingStatus')}
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
                          <span>{t('invoiceDetail.npReceiverCity')} <strong>{trackingResult.data.CityRecipient}</strong></span>
                        )}
                        {trackingResult.data.WarehouseRecipientAddress && (
                          <span>{t('invoiceDetail.npWarehouse')} <strong>{trackingResult.data.WarehouseRecipientAddress}</strong></span>
                        )}
                        {trackingResult.data.ScheduledDeliveryDate && (
                          <span>{t('invoiceDetail.npExpectedDelivery')} <strong>{trackingResult.data.ScheduledDeliveryDate}</strong></span>
                        )}
                        {trackingResult.data.ActualDeliveryDate && (
                          <span>{t('invoiceDetail.npReceivedDate')} <strong>{trackingResult.data.ActualDeliveryDate}</strong></span>
                        )}
                        {trackingResult.data.DocumentWeight && (
                          <span>{t('invoiceDetail.npWeight')} <strong>{trackingResult.data.DocumentWeight} {t('common.kgShort')}</strong></span>
                        )}
                        {trackingResult.data.DateScan && (
                          <span>{t('invoiceDetail.npLastScan')} <strong>{trackingResult.data.DateScan}</strong></span>
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

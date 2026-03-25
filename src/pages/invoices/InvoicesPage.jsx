import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Input, Select, Tag, Space, Statistic,
  Row, Col, Card, message, Popconfirm, DatePicker, Flex, Spin, Tooltip,
  Tabs, Modal, Form, InputNumber, Divider,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EyeOutlined,
  DeleteOutlined, ReloadOutlined, FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components';
import ModuleUnavailableBanner from '../../components/ModuleUnavailableBanner';
import {
  getInvoices, deleteInvoice, trackDeclaration,
  getDriverPickups, createDriverPickup, updateDriverPickup, deleteDriverPickup,
  generateDriverTabInvoice,
} from '../../api/invoices';
import { clientsAPI, trucksAPI, inventoryAPI } from '../../api';

const Y   = '#f5c518';
const INK = '#1a1a1a';

const STATUS_COLOR = {
  draft:     'default',
  sent:      'blue',
  paid:      'green',
  cancelled: 'red',
};
const STATUS_LABEL = {
  draft:     'Чернетка',
  sent:      'Виставлено',
  paid:      'Оплачено',
  cancelled: 'Скасовано',
};
const STATUS_OPTIONS = Object.entries(STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }));

const NP_TAG_COLOR = { '9': 'green', '8': 'blue', '10': 'red', '11': 'orange' };
const npTagColor = (code) => NP_TAG_COLOR[String(code)] ?? 'default';

// ─── Таб 1: НП / Самовивіз ───────────────────────────────────────────────────

function DeliveryInvoicesTab({ onModuleUnavailable }) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [pageSize]            = useState(20);

  const [search, setSearch]     = useState('');
  const [statusF, setStatusF]   = useState('');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo]     = useState(null);
  const [npStatuses, setNpStatuses] = useState({});

  const navigate = useNavigate();

  const fetchNpStatuses = (rows) => {
    const declarations = rows.map(r => r.nova_poshta_declaration).filter(Boolean);
    if (!declarations.length) { setNpStatuses({}); return; }
    setNpStatuses(prev => {
      const next = {};
      declarations.forEach(d => { next[d] = prev[d] ?? { loading: true }; });
      return next;
    });
    declarations.forEach(async (decl) => {
      try {
        const res = await trackDeclaration(decl);
        setNpStatuses(prev => ({ ...prev, [decl]: { loading: false, ...res.data } }));
      } catch {
        setNpStatuses(prev => ({ ...prev, [decl]: { loading: false, error: true } }));
      }
    });
  };

  const fetch = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, page_size: pageSize, invoice_type: 'delivery' };
      if (search)   params.search    = search;
      if (statusF)  params.status    = statusF;
      if (dateFrom) params.date_from = dateFrom.format('YYYY-MM-DD');
      if (dateTo)   params.date_to   = dateTo.format('YYYY-MM-DD');
      const res  = await getInvoices(params);
      const d    = res.data;
      const rows = d.results ?? d;
      setData(rows);
      setTotal(d.count ?? (Array.isArray(d) ? d.length : 0));
      fetchNpStatuses(rows);
    } catch (err) {
      if (err.isModuleUnavailable) { onModuleUnavailable(); return; }
      message.error('Не вдалося завантажити рахунки');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusF, dateFrom, dateTo]);

  useEffect(() => { setPage(1); fetch(1); }, [search, statusF, dateFrom, dateTo]);
  useEffect(() => { fetch(page); }, [page]);

  const handleDelete = async (id) => {
    try {
      await deleteInvoice(id);
      message.success('Видалено');
      fetch(page);
    } catch {
      message.error('Не вдалося видалити');
    }
  };

  const paid     = data.filter(r => r.status === 'paid').length;
  const sent     = data.filter(r => r.status === 'sent').length;
  const totalSum = data.reduce((s, r) => s + parseFloat(r.total || 0), 0);

  const columns = [
    {
      title: 'Номер', dataIndex: 'number', key: 'number', width: 140,
      render: (v, row) => (
        <Button type="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => navigate(`/invoices/${row.id}`)}>
          {v}
        </Button>
      ),
    },
    { title: 'Дата', dataIndex: 'date', key: 'date', width: 110, render: v => dayjs(v).format('DD.MM.YYYY') },
    { title: 'Клієнт', dataIndex: 'client_name', key: 'client_name' },
    {
      title: 'Вантажівка', dataIndex: 'truck_display', key: 'truck_display', width: 130,
      render: v => v || '—',
    },
    { title: 'Позицій', dataIndex: 'items_count', key: 'items_count', width: 80, align: 'center' },
    {
      title: 'Сума', dataIndex: 'total', key: 'total', width: 120, align: 'right',
      render: v => <strong>{parseFloat(v).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>,
    },
    {
      title: 'Статус', dataIndex: 'status', key: 'status', width: 120,
      render: v => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] || v}</Tag>,
    },
    {
      title: 'Доставка НП', key: 'np_status', width: 220,
      render: (_, row) => {
        const decl = row.nova_poshta_declaration;
        if (!decl) return '—';
        const np = npStatuses[decl];
        if (!np || np.loading) return <Spin size="small" />;
        if (np.error) return <Tag color="default">—</Tag>;
        return (
          <Tooltip title={
            <div style={{ fontSize: 12, color: '#fff' }}>
              {np.Status && <div style={{ fontWeight: 600, marginBottom: 4 }}>{np.Status}</div>}
              <div style={{ opacity: 0.75 }}>ТТН: {decl}</div>
              {np.CityRecipient && <div>Місто: {np.CityRecipient}</div>}
              {np.WarehouseRecipientAddress && <div>Відд.: {np.WarehouseRecipientAddress}</div>}
              {np.ActualDeliveryDate && <div>Отримано: {np.ActualDeliveryDate}</div>}
              {np.ScheduledDeliveryDate && !np.ActualDeliveryDate && <div>Очік.: {np.ScheduledDeliveryDate}</div>}
            </div>
          }>
            <Tag color={npTagColor(np.StatusCode)} style={{ cursor: 'default', whiteSpace: 'normal', lineHeight: '18px' }}>
              {np.Status || '—'}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '', key: 'actions', width: 90,
      render: (_, row) => (
        <Space onClick={e => e.stopPropagation()}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/invoices/${row.id}`)} />
          {row.status === 'draft' && (
            <Popconfirm title="Видалити рахунок?" onConfirm={() => handleDelete(row.id)} okText="Так" cancelText="Ні">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card size="small" style={{ borderTop: `3px solid ${Y}` }}>
            <Statistic title="Загальна сума" value={totalSum} suffix="₴" precision={0} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" style={{ borderTop: '3px solid #52c41a' }}>
            <Statistic title="Оплачено" value={paid} suffix="шт" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" style={{ borderTop: '3px solid #1677ff' }}>
            <Statistic title="Виставлено" value={sent} suffix="шт" valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
      </Row>

      <Flex gap={8} wrap="wrap" style={{ marginBottom: 12 }}>
        <Input
          placeholder="Пошук за №, клієнтом, номером авто"
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear
          style={{ width: 260 }}
        />
        <Select
          placeholder="Статус"
          value={statusF || undefined}
          onChange={v => setStatusF(v || '')}
          options={[{ value: '', label: 'Всі статуси' }, ...STATUS_OPTIONS]}
          style={{ width: 150 }}
          allowClear
        />
        <DatePicker placeholder="Дата від" value={dateFrom} onChange={setDateFrom} format="DD.MM.YYYY" style={{ width: 140 }} allowClear />
        <DatePicker placeholder="Дата до" value={dateTo}   onChange={setDateTo}   format="DD.MM.YYYY" style={{ width: 140 }} allowClear />
        <Button icon={<ReloadOutlined />} onClick={() => fetch(page)}>Оновити</Button>
      </Flex>

      <div style={{ background: '#fff', borderRadius: 8, borderTop: `4px solid ${Y}`, padding: 16 }}>
        <Table
          rowKey="id"
          dataSource={data}
          columns={columns}
          loading={loading}
          size="small"
          scroll={{ x: 960 }}
          onRow={record => ({ onClick: () => navigate(`/invoices/${record.id}`), style: { cursor: 'pointer' } })}
          pagination={{
            current: page, pageSize, total,
            showSizeChanger: false,
            showTotal: t => `Всього: ${t}`,
            onChange: setPage,
          }}
        />
      </div>
    </>
  );
}

// ─── Таб 2: Видача водієм ─────────────────────────────────────────────────────

function DriverTabSection({ onModuleUnavailable }) {
  const navigate = useNavigate();

  // Журнал видач
  const [pickups, setPickups]   = useState([]);
  const [loadingP, setLoadingP] = useState(false);
  const [clientFilter, setClientFilter]   = useState(null);
  const [clientLabel, setClientLabel]     = useState('');
  const [clientOptions, setClientOptions] = useState([]);
  const [truckFilter, setTruckFilter]     = useState(null);
  const [truckOptions, setTruckOptions]   = useState([]);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo]     = useState(null);

  // Виставлені рахунки driver_tab
  const [invoices, setInvoices]   = useState([]);
  const [loadingI, setLoadingI]   = useState(false);

  // Модальне вікно додавання/редагування
  const [modalOpen, setModalOpen]   = useState(false);
  const [editingPickup, setEditingPickup] = useState(null);
  const [form] = Form.useForm();
  const [modalClientId, setModalClientId] = useState(null);
  const [modalClientOptions, setModalClientOptions] = useState([]);
  const [modalTruckOptions, setModalTruckOptions]   = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving]     = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchPickups = useCallback(async () => {
    setLoadingP(true);
    try {
      const params = { uninvoiced: '1' };
      if (clientFilter) params.client   = clientFilter;
      if (truckFilter)  params.truck    = truckFilter;
      if (dateFrom) params.date_from = dateFrom.format('YYYY-MM-DD');
      if (dateTo)   params.date_to   = dateTo.format('YYYY-MM-DD');
      const res = await getDriverPickups(params);
      setPickups(res.data?.results ?? res.data ?? []);
    } catch (err) {
      if (err.isModuleUnavailable) { onModuleUnavailable(); return; }
      message.error('Не вдалося завантажити журнал видач');
    } finally {
      setLoadingP(false);
    }
  }, [clientFilter, truckFilter, dateFrom, dateTo]);

  const fetchInvoices = useCallback(async () => {
    setLoadingI(true);
    try {
      const res = await getInvoices({ invoice_type: 'driver_tab', page_size: 50 });
      const d   = res.data;
      setInvoices(d.results ?? d ?? []);
    } catch {
      // silent
    } finally {
      setLoadingI(false);
    }
  }, []);

  useEffect(() => { fetchPickups(); }, [clientFilter, truckFilter, dateFrom, dateTo]);
  useEffect(() => { fetchInvoices(); }, []);

  const searchClients = async (val) => {
    if (!val || val.length < 2) return;
    try {
      const res = await clientsAPI.getAll({ search: val, page_size: 20 });
      setClientOptions((res.data?.results || res.data || []).map(c => ({
        value: c.id, label: `${c.name} (${c.phone || '—'})`,
      })));
    } catch {}
  };

  const loadTrucks = async (clientId, setFn) => {
    if (!clientId) { setFn([]); return; }
    try {
      const res = await trucksAPI.getAll({ client: clientId, page_size: 100 });
      setFn((res.data?.results || res.data || []).map(t => ({
        value: t.id, label: `${t.license_plate} — ${t.specific_model_name || ''}`,
      })));
    } catch {}
  };

  const searchProducts = async (val) => {
    if (!val || val.length < 2) return;
    try {
      const res = await inventoryAPI.getAll({ search: val, page_size: 30 });
      setProducts(res.data?.results || res.data || []);
    } catch {}
  };

  const openAdd = () => {
    setEditingPickup(null);
    form.resetFields();
    form.setFieldValue('date', dayjs());
    if (clientFilter) {
      setModalClientId(clientFilter);
      form.setFieldValue('client', clientFilter);
      setModalClientOptions(clientOptions.length ? clientOptions : (clientLabel ? [{ value: clientFilter, label: clientLabel }] : []));
      loadTrucks(clientFilter, setModalTruckOptions);
    } else {
      setModalClientId(null);
      setModalClientOptions([]);
      setModalTruckOptions([]);
    }
    setProducts([]);
    setModalOpen(true);
  };

  const openEdit = (pickup) => {
    setEditingPickup(pickup);
    form.setFieldsValue({
      client: pickup.client,
      truck: pickup.truck,
      date: dayjs(pickup.date),
      product: pickup.product,
      description: pickup.description,
      quantity: parseFloat(pickup.quantity),
      unit_price: parseFloat(pickup.unit_price),
    });
    setModalClientId(pickup.client);
    setModalClientOptions([{ value: pickup.client, label: pickup.client_name }]);
    if (pickup.truck) {
      setModalTruckOptions([{ value: pickup.truck, label: pickup.truck_display }]);
    }
    if (pickup.product) {
      setProducts([{ id: pickup.product, name: pickup.product_name, sku_code: pickup.product_sku }]);
    }
    setModalOpen(true);
  };

  const handleModalSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        product: values.product || null,
        truck: values.truck || null,
      };
      setSaving(true);
      if (editingPickup) {
        await updateDriverPickup(editingPickup.id, payload);
        message.success('Оновлено');
      } else {
        await createDriverPickup(payload);
        message.success('Запис додано');
      }
      setModalOpen(false);
      fetchPickups();
    } catch (err) {
      if (err?.response?.data) {
        message.error(Object.values(err.response.data).flat().join(' '));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDriverPickup(id);
      message.success('Видалено');
      fetchPickups();
    } catch {
      message.error('Помилка');
    }
  };

  const handleGenerate = async () => {
    if (!clientFilter) { message.warning('Оберіть клієнта для виставлення рахунку'); return; }
    try {
      setGenerating(true);
      const res = await generateDriverTabInvoice({
        client: clientFilter,
        truck: truckFilter || undefined,
      });
      message.success(`Рахунок ${res.data.number} виставлено`);
      fetchPickups();
      fetchInvoices();
      navigate(`/invoices/${res.data.id}`);
    } catch (err) {
      message.error(err?.response?.data?.detail || 'Помилка при виставленні рахунку');
    } finally {
      setGenerating(false);
    }
  };

  const uninvoicedTotal = pickups.reduce((s, p) => s + parseFloat(p.total || 0), 0);

  const pickupColumns = [
    {
      title: 'Дата', dataIndex: 'date', key: 'date', width: 110,
      render: v => dayjs(v).format('DD.MM.YYYY'),
    },
    { title: 'Клієнт', dataIndex: 'client_name', key: 'client_name', width: 160 },
    {
      title: 'Вантажівка', dataIndex: 'truck_display', key: 'truck', width: 120,
      render: v => v || '—',
    },
    {
      title: 'Артикул', dataIndex: 'product_sku', key: 'sku', width: 100,
      render: v => v ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> : '—',
    },
    { title: 'Опис', dataIndex: 'description', key: 'description' },
    {
      title: 'К-сть', dataIndex: 'quantity', key: 'quantity', width: 75, align: 'right',
      render: v => parseFloat(v),
    },
    {
      title: 'Ціна', dataIndex: 'unit_price', key: 'unit_price', width: 110, align: 'right',
      render: v => `${parseFloat(v).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴`,
    },
    {
      title: 'Сума', dataIndex: 'total', key: 'total', width: 120, align: 'right',
      render: v => <strong>{parseFloat(v).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>,
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="Видалити запис?" onConfirm={() => handleDelete(row.id)} okText="Так" cancelText="Ні">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const invoiceColumns = [
    {
      title: 'Номер', dataIndex: 'number', key: 'number', width: 140,
      render: (v, row) => (
        <Button type="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => navigate(`/invoices/${row.id}`)}>
          {v}
        </Button>
      ),
    },
    { title: 'Дата', dataIndex: 'date', key: 'date', width: 110, render: v => dayjs(v).format('DD.MM.YYYY') },
    { title: 'Клієнт', dataIndex: 'client_name', key: 'client_name' },
    { title: 'Вантажівка', dataIndex: 'truck_display', key: 'truck', width: 120, render: v => v || '—' },
    { title: 'Позицій', dataIndex: 'items_count', key: 'items_count', width: 80, align: 'center' },
    {
      title: 'Сума', dataIndex: 'total', key: 'total', width: 120, align: 'right',
      render: v => <strong>{parseFloat(v).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>,
    },
    {
      title: 'Статус', dataIndex: 'status', key: 'status', width: 120,
      render: v => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] || v}</Tag>,
    },
    {
      title: '', key: 'actions', width: 50,
      render: (_, row) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/invoices/${row.id}`)} />
      ),
    },
  ];

  return (
    <>
      {/* Фільтри + кнопки */}
      <Flex gap={8} wrap="wrap" style={{ marginBottom: 12 }}>
        <Select
          showSearch
          allowClear
          placeholder="Фільтр за клієнтом"
          filterOption={false}
          onSearch={searchClients}
          onSelect={(id, opt) => {
            setClientFilter(id);
            setClientLabel(opt.label);
            setTruckFilter(null);
            loadTrucks(id, setTruckOptions);
          }}
          onClear={() => { setClientFilter(null); setClientLabel(''); setTruckFilter(null); setTruckOptions([]); }}
          options={clientOptions}
          style={{ width: 240 }}
        />
        {clientFilter && (
          <Select
            allowClear
            placeholder="Вантажівка"
            value={truckFilter}
            onChange={v => setTruckFilter(v || null)}
            options={truckOptions}
            style={{ width: 200 }}
          />
        )}
        <DatePicker placeholder="Дата від" value={dateFrom} onChange={setDateFrom} format="DD.MM.YYYY" style={{ width: 130 }} allowClear />
        <DatePicker placeholder="Дата до" value={dateTo}   onChange={setDateTo}   format="DD.MM.YYYY" style={{ width: 130 }} allowClear />
        <Button icon={<ReloadOutlined />} onClick={fetchPickups} />
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}
          style={{ background: Y, color: INK, borderColor: Y, fontWeight: 600 }}>
          Додати видачу
        </Button>
        {clientFilter && pickups.length > 0 && (
          <Button
            icon={<FileTextOutlined />}
            loading={generating}
            onClick={handleGenerate}
            style={{ borderColor: '#52c41a', color: '#52c41a', fontWeight: 600 }}
          >
            Виставити рахунок
          </Button>
        )}
      </Flex>

      {/* Незарахований журнал */}
      <div style={{ background: '#fff', borderRadius: 8, borderTop: `4px solid ${Y}`, padding: 16, marginBottom: 24 }}>
        <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 15 }}>
          Незарахований журнал
          {uninvoicedTotal > 0 && (
            <span style={{ marginLeft: 12, color: '#888', fontWeight: 400, fontSize: 13 }}>
              Накопичено: <strong style={{ color: INK }}>{uninvoicedTotal.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>
            </span>
          )}
        </div>
        <Table
          rowKey="id"
          dataSource={pickups}
          columns={pickupColumns}
          loading={loadingP}
          size="small"
          scroll={{ x: 900 }}
          pagination={{ pageSize: 50, showTotal: t => `Всього: ${t}`, hideOnSinglePage: true }}
          locale={{ emptyText: clientFilter ? 'Немає незарахованих видач для цього клієнта' : 'Оберіть клієнта або перегляньте всі записи' }}
        />
      </div>

      <Divider orientation="left" style={{ fontWeight: 600 }}>Виставлені рахунки</Divider>

      {/* Виставлені рахунки driver_tab */}
      <div style={{ background: '#fff', borderRadius: 8, borderTop: '4px solid #1677ff', padding: 16 }}>
        <Table
          rowKey="id"
          dataSource={invoices}
          columns={invoiceColumns}
          loading={loadingI}
          size="small"
          scroll={{ x: 760 }}
          pagination={{ pageSize: 20, showTotal: t => `Всього: ${t}`, hideOnSinglePage: true }}
          locale={{ emptyText: 'Рахунків типу «Видача водієм» ще немає' }}
          onRow={record => ({ onClick: () => navigate(`/invoices/${record.id}`), style: { cursor: 'pointer' } })}
        />
      </div>

      {/* Модальне вікно */}
      <Modal
        title={editingPickup ? 'Редагувати видачу' : 'Додати видачу'}
        open={modalOpen}
        onOk={handleModalSave}
        onCancel={() => setModalOpen(false)}
        okText="Зберегти"
        cancelText="Скасувати"
        okButtonProps={{ loading: saving, style: { background: Y, color: INK, borderColor: Y } }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="client" label="Клієнт" rules={[{ required: true, message: 'Оберіть клієнта' }]}>
                <Select
                  showSearch filterOption={false}
                  placeholder="Введіть ім'я або телефон"
                  options={modalClientOptions}
                  onSearch={async (val) => {
                    if (!val || val.length < 2) return;
                    try {
                      const res = await clientsAPI.getAll({ search: val, page_size: 20 });
                      setModalClientOptions((res.data?.results || res.data || []).map(c => ({
                        value: c.id, label: `${c.name} (${c.phone || '—'})`,
                      })));
                    } catch {}
                  }}
                  onSelect={(id) => {
                    setModalClientId(id);
                    form.setFieldValue('truck', undefined);
                    loadTrucks(id, setModalTruckOptions);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="truck" label="Вантажівка">
                <Select
                  allowClear
                  placeholder="Необов'язково"
                  disabled={!modalClientId}
                  options={modalTruckOptions}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="date" label="Дата" rules={[{ required: true }]}>
            <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="product" label="Товар зі складу">
            <Select
              showSearch allowClear
              placeholder="Пошук за назвою або артикулом"
              filterOption={false}
              onSearch={searchProducts}
              onSelect={(productId) => {
                const p = products.find(x => x.id === productId);
                if (p) {
                  form.setFieldsValue({
                    description: p.name,
                    unit_price: parseFloat(p.selling_price || 0),
                  });
                }
              }}
              options={products.map(p => ({
                value: p.id,
                label: `${p.sku_code ? p.sku_code + ' — ' : ''}${p.name}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="description" label="Опис" rules={[{ required: true, message: 'Введіть опис' }]}>
            <Input placeholder="Назва запчастини або роботи" maxLength={255} />
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

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [moduleUnavailable, setModuleUnavailable] = useState(false);
  const [activeTab, setActiveTab] = useState('delivery');

  if (moduleUnavailable) return <ModuleUnavailableBanner moduleName="Рахунки" />;

  return (
    <div style={{ paddingBottom: 24 }}>
      <PageHeader
        title="Рахунки на запчастини"
        subtitle="Продаж запчастин поза сервісом"
        extra={
          activeTab === 'delivery' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/invoices/new')}
              style={{ background: Y, color: INK, borderColor: Y, fontWeight: 600 }}
            >
              Новий рахунок
            </Button>
          )
        }
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'delivery',
            label: '📦 НП / Самовивіз',
            children: <DeliveryInvoicesTab onModuleUnavailable={() => setModuleUnavailable(true)} />,
          },
          {
            key: 'driver_tab',
            label: '🚚 Видача водієм',
            children: <DriverTabSection onModuleUnavailable={() => setModuleUnavailable(true)} />,
          },
        ]}
      />
    </div>
  );
}

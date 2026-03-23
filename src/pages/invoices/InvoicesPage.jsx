import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Input, Select, Tag, Space, Statistic,
  Row, Col, Card, message, Popconfirm, DatePicker, Flex, Spin, Tooltip,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EyeOutlined,
  DeleteOutlined, ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components';
import ModuleUnavailableBanner from '../../components/ModuleUnavailableBanner';
import { getInvoices, deleteInvoice, trackDeclaration } from '../../api/invoices';

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

export default function InvoicesPage() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [pageSize]            = useState(20);

  const [search, setSearch]       = useState('');
  const [statusF, setStatusF]     = useState('');
  const [dateFrom, setDateFrom]   = useState(null);
  const [dateTo, setDateTo]       = useState(null);
  const [moduleUnavailable, setModuleUnavailable] = useState(false);
  // НП-статуси: { [declaration]: { loading, status, statusCode } }
  const [npStatuses, setNpStatuses] = useState({});

  const navigate = useNavigate();

  const fetchNpStatuses = (rows) => {
    const declarations = rows
      .map(r => r.nova_poshta_declaration)
      .filter(Boolean);
    if (!declarations.length) { setNpStatuses({}); return; }

    // Помічаємо всі як loading
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
      const params = { page: p, page_size: pageSize };
      if (search)   params.search    = search;
      if (statusF)  params.status    = statusF;
      if (dateFrom) params.date_from = dateFrom.format('YYYY-MM-DD');
      if (dateTo)   params.date_to   = dateTo.format('YYYY-MM-DD');
      const res = await getInvoices(params);
      const d   = res.data;
      const rows = d.results ?? d;
      setData(rows);
      setTotal(d.count ?? (Array.isArray(d) ? d.length : 0));
      fetchNpStatuses(rows);
    } catch (err) {
      if (err.isModuleUnavailable) { setModuleUnavailable(true); return; }
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

  // stats
  const paid      = data.filter(r => r.status === 'paid').length;
  const sent      = data.filter(r => r.status === 'sent').length;
  const totalSum  = data.reduce((s, r) => s + parseFloat(r.total || 0), 0);

  const columns = [
    {
      title: 'Номер',
      dataIndex: 'number',
      key: 'number',
      width: 140,
      render: (v, row) => (
        <Button type="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => navigate(`/invoices/${row.id}`)}>
          {v}
        </Button>
      ),
    },
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (v) => dayjs(v).format('DD.MM.YYYY'),
    },
    {
      title: 'Клієнт',
      dataIndex: 'client_name',
      key: 'client_name',
    },
    {
      title: 'Вантажівка',
      dataIndex: 'truck_display',
      key: 'truck_display',
      width: 130,
      render: (v) => v || '—',
    },
    {
      title: 'Позицій',
      dataIndex: 'items_count',
      key: 'items_count',
      width: 80,
      align: 'center',
    },
    {
      title: 'Сума',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right',
      render: (v) => <strong>{parseFloat(v).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] || v}</Tag>,
    },
    {
      title: 'Доставка НП',
      key: 'np_status',
      width: 160,
      render: (_, row) => {
        const decl = row.nova_poshta_declaration;
        if (!decl) return '—';
        const np = npStatuses[decl];
        if (!np || np.loading) return <Spin size="small" />;
        if (np.error) return <Tag color="default">—</Tag>;
        return (
          <Tooltip title={
            <div style={{ fontSize: 12 }}>
              <div>№ {decl}</div>
              {np.CityRecipient && <div>Місто: {np.CityRecipient}</div>}
              {np.WarehouseRecipientAddress && <div>Відд.: {np.WarehouseRecipientAddress}</div>}
              {np.ActualDeliveryDate && <div>Отримано: {np.ActualDeliveryDate}</div>}
              {np.ScheduledDeliveryDate && !np.ActualDeliveryDate && <div>Очік.: {np.ScheduledDeliveryDate}</div>}
            </div>
          }>
            <Tag color={npTagColor(np.StatusCode)} style={{ cursor: 'default', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {np.Status || '—'}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 90,
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

  if (moduleUnavailable) return <ModuleUnavailableBanner moduleName="Рахунки" />;

  return (
    <div style={{ paddingBottom: 24 }}>
      <PageHeader
        title="Рахунки на запчастини"
        subtitle="Продаж запчастин поза сервісом"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/invoices/new')}
            style={{ background: Y, color: INK, borderColor: Y, fontWeight: 600 }}
          >
            Новий рахунок
          </Button>
        }
      />

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
          scroll={{ x: 900 }}
          onRow={(record) => ({
            onClick: () => navigate(`/invoices/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page, pageSize, total,
            showSizeChanger: false,
            showTotal: t => `Всього: ${t}`,
            onChange: setPage,
          }}
        />
      </div>
    </div>
  );
}

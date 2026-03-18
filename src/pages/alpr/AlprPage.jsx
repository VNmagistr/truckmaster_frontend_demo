import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tabs, Button, Input, Select, DatePicker, Tag, Space,
  Modal, Form, Switch, Popconfirm, message, Typography, Flex, Badge,
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  ReloadOutlined, EyeInvisibleOutlined, CarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components';
import { formatDateTime } from '../../utils/formatters';
import {
  getArrivals, getIgnored, createIgnored, updateIgnored, deleteIgnored,
} from '../../api/alpr';

const Y = '#f5c518';
const INK = '#1a1a1a';

const REASON_OPTIONS = [
  { value: 'staff',    label: 'Персонал СТО' },
  { value: 'delivery', label: 'Доставка запчастин' },
  { value: 'neighbor', label: 'Сусідня організація' },
  { value: 'other',    label: 'Інше' },
];

const REASON_COLOR = {
  staff:    'blue',
  delivery: 'purple',
  neighbor: 'cyan',
  other:    'default',
};

// ─── Журнал заїздів ──────────────────────────────────────────────────────────

function ArrivalsTab() {
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pageSize]              = useState(20);
  const [dateFilter, setDate]   = useState(null);
  const [plate, setPlate]       = useState('');
  const [ignoredFilter, setIgnoredFilter] = useState('');

  const navigate = useNavigate();

  const fetch = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, page_size: pageSize };
      if (dateFilter) params.date = dateFilter.format('YYYY-MM-DD');
      if (plate)      params.plate = plate;
      if (ignoredFilter !== '') params.ignored = ignoredFilter;
      const res = await getArrivals(params);
      const d = res.data;
      setData(d.results ?? d);
      setTotal(d.count ?? (d.results ? d.count : d.length));
    } catch {
      message.error('Не вдалося завантажити журнал');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, dateFilter, plate, ignoredFilter]);

  useEffect(() => { setPage(1); fetch(1); }, [dateFilter, plate, ignoredFilter]);
  useEffect(() => { fetch(page); }, [page]);

  const columns = [
    {
      title: 'Час заїзду',
      dataIndex: 'detected_at',
      key: 'detected_at',
      width: 160,
      render: (v) => formatDateTime(v),
    },
    {
      title: 'Номер',
      dataIndex: 'license_plate',
      key: 'license_plate',
      width: 130,
      render: (v, row) => (
        <Space>
          <Tag color={row.ignored ? 'default' : Y} style={{ color: row.ignored ? undefined : INK, fontWeight: 700, fontSize: 13 }}>
            {v}
          </Tag>
          {row.ignored && <Tag color="red">Ігнор</Tag>}
        </Space>
      ),
    },
    {
      title: 'Клієнт',
      dataIndex: 'client_name',
      key: 'client_name',
      render: (v, row) => {
        if (row.ignored) return <span style={{ color: '#999' }}>{row.ignore_reason}</span>;
        if (v) return (
          <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/clients/${row.client_id}`)}>
            {v}
          </Button>
        );
        return <span style={{ color: '#999' }}>Невідомий</span>;
      },
    },
    {
      title: 'Авто',
      dataIndex: 'truck_info',
      key: 'truck_info',
      render: (v, row) => {
        if (!v) return '—';
        return (
          <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/trucks/${v.id}`)}>
            {v.specific_model_name || v.license_plate}
          </Button>
        );
      },
    },
    {
      title: 'Запис на СТО',
      dataIndex: 'appointment_info',
      key: 'appointment_info',
      render: (v) => {
        if (!v) return '—';
        const STATUS = { pending: 'orange', confirmed: 'green', cancelled: 'red', completed: 'blue', no_show: 'default' };
        const LABELS = { pending: 'Очікує', confirmed: 'Підтверджено', cancelled: 'Скасовано', completed: 'Завершено', no_show: 'Не з\'явився' };
        return (
          <Space direction="vertical" size={2}>
            <span>{dayjs(v.scheduled_dt).format('DD.MM.YYYY HH:mm')}</span>
            <Tag color={STATUS[v.status]}>{LABELS[v.status] || v.status}</Tag>
          </Space>
        );
      },
    },
    {
      title: 'Камера',
      dataIndex: 'camera_id',
      key: 'camera_id',
      width: 100,
      render: (v) => v || '—',
    },
    {
      title: 'Впевн.%',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 90,
      render: (v) => v != null ? `${Math.round(v)}%` : '—',
    },
  ];

  return (
    <>
      <Flex gap={8} wrap="wrap" style={{ marginBottom: 12 }}>
        <DatePicker
          placeholder="Фільтр за датою"
          value={dateFilter}
          onChange={setDate}
          format="DD.MM.YYYY"
          allowClear
          style={{ width: 160 }}
        />
        <Input
          placeholder="Пошук за номером"
          prefix={<SearchOutlined />}
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          allowClear
          style={{ width: 180 }}
        />
        <Select
          placeholder="Всі статуси"
          value={ignoredFilter}
          onChange={setIgnoredFilter}
          options={[
            { value: '',      label: 'Всі' },
            { value: 'false', label: 'Тільки нові' },
            { value: 'true',  label: 'Тільки ігноровані' },
          ]}
          style={{ width: 170 }}
          allowClear={false}
        />
        <Button icon={<ReloadOutlined />} onClick={() => fetch(page)}>Оновити</Button>
      </Flex>

      <Table
        rowKey="id"
        dataSource={data}
        columns={columns}
        loading={loading}
        size="small"
        scroll={{ x: 700 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (t) => `Всього: ${t}`,
          onChange: setPage,
        }}
      />
    </>
  );
}

// ─── Список ігнору ────────────────────────────────────────────────────────────

function IgnoredTab() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getIgnored();
      setData(res.data);
    } catch {
      message.error('Не вдалося завантажити список ігнору');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, []);

  const openAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldValue('is_active', true);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await updateIgnored(editingId, values);
        message.success('Оновлено');
      } else {
        await createIgnored(values);
        message.success('Додано');
      }
      setModalOpen(false);
      fetch();
    } catch (err) {
      if (err?.response?.data) {
        const detail = Object.values(err.response.data).flat().join(' ');
        message.error(detail || 'Помилка збереження');
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteIgnored(id);
      message.success('Видалено');
      fetch();
    } catch {
      message.error('Помилка видалення');
    }
  };

  const columns = [
    {
      title: 'Держномер',
      dataIndex: 'license_plate',
      key: 'license_plate',
      width: 130,
      render: (v) => (
        <Tag style={{ fontWeight: 700, fontSize: 13 }}>{v}</Tag>
      ),
    },
    {
      title: 'Категорія',
      dataIndex: 'reason_type',
      key: 'reason_type',
      width: 160,
      render: (v, row) => (
        <Tag color={REASON_COLOR[v]}>{row.reason_type_display}</Tag>
      ),
    },
    {
      title: 'Опис',
      dataIndex: 'description',
      key: 'description',
      render: (v) => v || '—',
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 90,
      render: (v) => v
        ? <Badge status="success" text="Активний" />
        : <Badge status="default" text="Вимкнено" />,
    },
    {
      title: 'Додав',
      dataIndex: 'added_by_name',
      key: 'added_by_name',
      width: 130,
      render: (v) => v || '—',
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Видалити з ігнор-листа?"
            onConfirm={() => handleDelete(record.id)}
            okText="Так" cancelText="Ні"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
        <Typography.Text type="secondary">
          Автомобілі з цього списку не викликають сповіщень персоналу
        </Typography.Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openAdd}
          style={{ background: Y, color: INK, borderColor: Y, fontWeight: 600 }}
        >
          Додати
        </Button>
      </Flex>

      <Table
        rowKey="id"
        dataSource={data}
        columns={columns}
        loading={loading}
        size="small"
        scroll={{ x: 600 }}
        pagination={false}
      />

      <Modal
        title={editingId ? 'Редагувати запис' : 'Додати в ігнор-лист'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="Зберегти"
        cancelText="Скасувати"
        okButtonProps={{ style: { background: Y, color: INK, borderColor: Y } }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="license_plate"
            label="Держномер"
            rules={[{ required: true, message: 'Введіть держномер' }]}
          >
            <Input
              placeholder="AA1234BB"
              style={{ textTransform: 'uppercase' }}
              maxLength={20}
            />
          </Form.Item>
          <Form.Item
            name="reason_type"
            label="Категорія"
            rules={[{ required: true, message: 'Оберіть категорію' }]}
          >
            <Select options={REASON_OPTIONS} placeholder="Оберіть категорію" />
          </Form.Item>
          <Form.Item name="description" label="Опис">
            <Input placeholder="Наприклад: Форд Транзіт — Автолідер запчастини" maxLength={255} />
          </Form.Item>
          <Form.Item name="is_active" label="Активний" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ─── Головна сторінка ALPR ───────────────────────────────────────────────────

export default function AlprPage() {
  const tabItems = [
    {
      key: 'arrivals',
      label: (
        <Space>
          <CarOutlined />
          Журнал заїздів
        </Space>
      ),
      children: <ArrivalsTab />,
    },
    {
      key: 'ignored',
      label: (
        <Space>
          <EyeInvisibleOutlined />
          Список ігнору
        </Space>
      ),
      children: <IgnoredTab />,
    },
  ];

  return (
    <div style={{ padding: '0 0 24px' }}>
      <PageHeader
        title="Журнал автомобілів"
        subtitle="Фіксація заїздів за номерними знаками"
      />
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          borderTop: `4px solid ${Y}`,
          padding: '0 16px 16px',
          marginTop: 16,
        }}
      >
        <Tabs defaultActiveKey="arrivals" items={tabItems} />
      </div>
    </div>
  );
}

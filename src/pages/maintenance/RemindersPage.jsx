import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tabs, Button, Input, Select, Tag, Space, Badge,
  Modal, Form, InputNumber, DatePicker, Popconfirm,
  message, Typography, Flex, Statistic, Row, Col, Card,
} from 'antd';
import {
  PlusOutlined, EditOutlined, CheckOutlined, StopOutlined,
  ReloadOutlined, BellOutlined, WarningOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components';
import ModuleUnavailableBanner from '../../components/ModuleUnavailableBanner';
import { maintenanceAPI, trucksAPI } from '../../api';

const Y = '#f5c518';
const INK = '#1a1a1a';

const STATUS_COLOR = {
  pending:   'blue',
  notified:  'orange',
  overdue:   'red',
  completed: 'green',
  dismissed: 'default',
};
const STATUS_LABEL = {
  pending:   'Очікує',
  notified:  'Сповіщено',
  overdue:   'Прострочено',
  completed: 'Виконано',
  dismissed: 'Відхилено',
};
const PRIORITY_COLOR = {
  low:      'default',
  medium:   'blue',
  high:     'orange',
  critical: 'red',
};
const PRIORITY_LABEL = {
  low:      'Низький',
  medium:   'Середній',
  high:     'Високий',
  critical: 'Критичний',
};
const REMINDER_TYPE_OPTIONS = [
  { value: 'mileage', label: 'За пробігом' },
  { value: 'date',    label: 'За датою' },
  { value: 'both',    label: 'За пробігом або датою' },
];
const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABEL).map(([v, l]) => ({ value: v, label: l }));
const STATUS_OPTIONS = Object.entries(STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }));
const NOTIFY_FREQ_OPTIONS = [
  { value: 1,  label: 'Щодня' },
  { value: 2,  label: 'Кожні 2 дні' },
  { value: 3,  label: 'Кожні 3 дні' },
  { value: 7,  label: 'Раз на тиждень' },
  { value: 14, label: 'Раз на 2 тижні' },
];

// ─── Спільні колонки таблиці ──────────────────────────────────────────────────

function buildColumns({ onEdit, onComplete, onDismiss, showTruck = true }) {
  const cols = [];

  if (showTruck) {
    cols.push({
      title: 'Вантажівка',
      dataIndex: 'truck_display',
      key: 'truck',
      width: 150,
      render: (v, row) => <Link to={`/trucks/${row.truck}`}>{v}</Link>,
    });
  }

  cols.push(
    {
      title: 'Назва',
      dataIndex: 'title',
      key: 'title',
      render: (v, row) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{v}</span>
          {row.service_type_name && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.service_type_name}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] || v}</Tag>,
    },
    {
      title: 'Пріоритет',
      dataIndex: 'priority',
      key: 'priority',
      width: 110,
      render: (v) => <Tag color={PRIORITY_COLOR[v]}>{PRIORITY_LABEL[v] || v}</Tag>,
    },
    {
      title: 'Ціль',
      key: 'target',
      width: 160,
      render: (_, row) => {
        const parts = [];
        if (row.target_date) {
          const d = dayjs(row.target_date);
          const diff = d.diff(dayjs(), 'day');
          const color = diff < 0 ? 'red' : diff <= 7 ? 'orange' : undefined;
          parts.push(
            <div key="date" style={{ color }}>
              📅 {d.format('DD.MM.YYYY')}
              {diff < 0 && <span> ({Math.abs(diff)} дн. тому)</span>}
              {diff >= 0 && diff <= 30 && <span> (через {diff} дн.)</span>}
            </div>
          );
        }
        if (row.target_mileage) {
          parts.push(
            <div key="km" style={{ color: '#555' }}>
              🛣 {row.target_mileage.toLocaleString('uk')} км
            </div>
          );
        }
        return parts.length ? parts : '—';
      },
    },
    {
      title: 'Останнє сповіщення',
      dataIndex: 'last_notified_at',
      key: 'last_notified_at',
      width: 140,
      render: (v) => v ? dayjs(v).format('DD.MM.YYYY') : '—',
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(row)} />
          {!['completed', 'dismissed'].includes(row.status) && (
            <>
              <Popconfirm
                title="Позначити як виконане?"
                onConfirm={() => onComplete(row.id)}
                okText="Так" cancelText="Ні"
              >
                <Button size="small" icon={<CheckOutlined />} style={{ color: 'green', borderColor: 'green' }} />
              </Popconfirm>
              <Popconfirm
                title="Відхилити нагадування?"
                onConfirm={() => onDismiss(row.id)}
                okText="Так" cancelText="Ні"
              >
                <Button size="small" danger icon={<StopOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  );

  return cols;
}

// ─── Модальне вікно додавання / редагування ───────────────────────────────────

function ReminderModal({ open, onClose, onSaved, editingRecord, trucks, serviceTypes }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const reminderType = Form.useWatch('reminder_type', form);

  useEffect(() => {
    if (open) {
      if (editingRecord) {
        form.setFieldsValue({
          ...editingRecord,
          target_date: editingRecord.target_date ? dayjs(editingRecord.target_date) : null,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ reminder_type: 'both', priority: 'medium', notify_frequency_days: 7 });
      }
    }
  }, [open, editingRecord]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (values.target_date) values.target_date = values.target_date.format('YYYY-MM-DD');
      setSaving(true);
      if (editingRecord) {
        await maintenanceAPI.updateReminder(editingRecord.id, values);
        message.success('Оновлено');
      } else {
        await maintenanceAPI.createReminder(values);
        message.success('Нагадування створено');
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err?.response?.data) {
        const detail = Object.values(err.response.data).flat().join(' ');
        message.error(detail || 'Помилка збереження');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editingRecord ? 'Редагувати нагадування' : 'Нове нагадування'}
      open={open}
      onOk={handleSave}
      onCancel={onClose}
      okText="Зберегти"
      cancelText="Скасувати"
      okButtonProps={{ loading: saving, style: { background: Y, color: INK, borderColor: Y } }}
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="truck" label="Вантажівка" rules={[{ required: true, message: 'Оберіть вантажівку' }]}>
          <Select
            showSearch
            placeholder="Оберіть вантажівку"
            optionFilterProp="label"
            options={trucks.map(t => ({ value: t.id, label: `${t.license_plate} — ${t.specific_model_name || ''}` }))}
          />
        </Form.Item>

        <Form.Item name="title" label="Назва" rules={[{ required: true, message: 'Введіть назву' }]}>
          <Input placeholder="напр. Заміна моторної оливи" maxLength={200} />
        </Form.Item>

        <Form.Item name="service_type" label="Тип ТО">
          <Select
            allowClear
            placeholder="Оберіть тип (необов'язково)"
            options={serviceTypes.map(t => ({ value: t.id, label: t.name }))}
          />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="reminder_type" label="Тип нагадування" rules={[{ required: true }]}>
              <Select options={REMINDER_TYPE_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="priority" label="Пріоритет" rules={[{ required: true }]}>
              <Select options={PRIORITY_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>

        {['mileage', 'both'].includes(reminderType) && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="target_mileage" label="Цільовий пробіг (км)">
                <InputNumber min={0} step={1000} style={{ width: '100%' }} addonAfter="км" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="interval_km" label="Інтервал (км)">
                <InputNumber min={0} step={1000} style={{ width: '100%' }} addonAfter="км" placeholder="з типу ТО" />
              </Form.Item>
            </Col>
          </Row>
        )}

        {['date', 'both'].includes(reminderType) && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="target_date" label="Цільова дата">
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="interval_months" label="Інтервал (місяців)">
                <InputNumber min={1} max={60} style={{ width: '100%' }} addonAfter="міс" placeholder="з типу ТО" />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Form.Item name="notify_frequency_days" label="Частота повторення">
          <Select options={NOTIFY_FREQ_OPTIONS} />
        </Form.Item>

        <Form.Item name="description" label="Опис">
          <Input.TextArea rows={2} maxLength={500} placeholder="Додаткові примітки..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ─── Головна сторінка ─────────────────────────────────────────────────────────

export default function RemindersPage() {
  const [reminders, setReminders]     = useState([]);
  const [loading, setLoading]         = useState(false);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [pageSize]                    = useState(25);

  const [statusFilter, setStatus]     = useState('');
  const [priorityFilter, setPriority] = useState('');
  const [search, setSearch]           = useState('');

  const [trucks, setTrucks]           = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);

  const [modalOpen, setModalOpen]     = useState(false);
  const [editing, setEditing]         = useState(null);
  const [moduleUnavailable, setModuleUnavailable] = useState(false);

  // Stats
  const overdue   = reminders.filter(r => r.status === 'overdue').length;
  const pending   = reminders.filter(r => r.status === 'pending').length;
  const notified  = reminders.filter(r => r.status === 'notified').length;

  const fetch = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, page_size: pageSize };
      if (statusFilter)   params.status   = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search)         params.search   = search;
      const res = await maintenanceAPI.getReminders(params);
      const d = res.data;
      setReminders(d.results ?? d);
      setTotal(d.count ?? (Array.isArray(d) ? d.length : 0));
    } catch (err) {
      if (err.isModuleUnavailable) { setModuleUnavailable(true); return; }
      message.error('Не вдалося завантажити нагадування');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, priorityFilter, search]);

  useEffect(() => { setPage(1); fetch(1); }, [statusFilter, priorityFilter, search]);
  useEffect(() => { fetch(page); }, [page]);

  useEffect(() => {
    trucksAPI.getAll({ page_size: 500, ordering: 'license_plate' })
      .then(r => { const d = r.data; setTrucks(d.results || d); })
      .catch(() => {});
    maintenanceAPI.getServiceTypes()
      .then(r => { const d = r.data; setServiceTypes(d.results || d); })
      .catch(() => {});
  }, []);

  const handleComplete = async (id) => {
    try {
      await maintenanceAPI.completeReminder(id);
      message.success('Позначено як виконане');
      fetch(page);
    } catch { message.error('Помилка'); }
  };

  const handleDismiss = async (id) => {
    try {
      await maintenanceAPI.dismissReminder(id);
      message.success('Відхилено');
      fetch(page);
    } catch { message.error('Помилка'); }
  };

  const columns = buildColumns({
    onEdit: (r) => { setEditing(r); setModalOpen(true); },
    onComplete: handleComplete,
    onDismiss: handleDismiss,
    showTruck: true,
  });

  const activeData = reminders.filter(r => !['completed', 'dismissed'].includes(r.status));
  const allData    = reminders;

  const tabItems = [
    {
      key: 'active',
      label: (
        <Space>
          <BellOutlined />
          Активні
          {(pending + notified + overdue) > 0 && (
            <Badge count={overdue > 0 ? overdue : pending + notified}
                   color={overdue > 0 ? 'red' : 'blue'} />
          )}
        </Space>
      ),
      children: (
        <Table
          rowKey="id"
          dataSource={activeData}
          columns={columns}
          loading={loading}
          size="small"
          scroll={{ x: 800 }}
          rowClassName={(r) => r.status === 'overdue' ? 'row-overdue' : ''}
          pagination={{
            current: page, pageSize, total,
            showSizeChanger: false,
            showTotal: (t) => `Всього: ${t}`,
            onChange: setPage,
          }}
        />
      ),
    },
    {
      key: 'all',
      label: 'Всі',
      children: (
        <Table
          rowKey="id"
          dataSource={allData}
          columns={columns}
          loading={loading}
          size="small"
          scroll={{ x: 800 }}
          pagination={{
            current: page, pageSize, total,
            showSizeChanger: false,
            showTotal: (t) => `Всього: ${t}`,
            onChange: setPage,
          }}
        />
      ),
    },
  ];

  if (moduleUnavailable) return <ModuleUnavailableBanner moduleName="Нагадування ТО" />;

  return (
    <div style={{ paddingBottom: 24 }}>
      <PageHeader
        title="Нагадування про ТО"
        subtitle="Планове технічне обслуговування вантажівок"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setEditing(null); setModalOpen(true); }}
            style={{ background: Y, color: INK, borderColor: Y, fontWeight: 600 }}
          >
            Додати
          </Button>
        }
      />

      {/* Статистика */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card size="small" style={{ borderTop: `3px solid red` }}>
            <Statistic
              title="Прострочено"
              value={overdue}
              prefix={<WarningOutlined style={{ color: 'red' }} />}
              valueStyle={{ color: 'red' }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" style={{ borderTop: `3px solid #faad14` }}>
            <Statistic
              title="Сповіщено"
              value={notified}
              prefix={<BellOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" style={{ borderTop: `3px solid #1677ff` }}>
            <Statistic
              title="Очікує"
              value={pending}
              prefix={<ClockCircleOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Фільтри */}
      <Flex gap={8} wrap="wrap" style={{ marginBottom: 12 }}>
        <Input
          placeholder="Пошук за номером / назвою"
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear
          style={{ width: 220 }}
        />
        <Select
          placeholder="Статус"
          value={statusFilter || undefined}
          onChange={v => setStatus(v || '')}
          options={[{ value: '', label: 'Всі статуси' }, ...STATUS_OPTIONS]}
          style={{ width: 160 }}
          allowClear
        />
        <Select
          placeholder="Пріоритет"
          value={priorityFilter || undefined}
          onChange={v => setPriority(v || '')}
          options={[{ value: '', label: 'Всі пріоритети' }, ...PRIORITY_OPTIONS]}
          style={{ width: 160 }}
          allowClear
        />
        <Button icon={<ReloadOutlined />} onClick={() => fetch(page)}>Оновити</Button>
      </Flex>

      <div style={{ background: '#fff', borderRadius: 8, borderTop: `4px solid ${Y}`, padding: '0 16px 16px', }}>
        <Tabs defaultActiveKey="active" items={tabItems} />
      </div>

      <ReminderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => fetch(page)}
        editingRecord={editing}
        trucks={trucks}
        serviceTypes={serviceTypes}
      />

      <style>{`.row-overdue td { background: #fff1f0 !important; }`}</style>
    </div>
  );
}

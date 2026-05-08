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
import { useTranslation } from 'react-i18next';
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
const PRIORITY_COLOR = {
  low:      'default',
  medium:   'blue',
  high:     'orange',
  critical: 'red',
};
const STATUS_KEYS = ['pending', 'notified', 'overdue', 'completed', 'dismissed'];
const PRIORITY_KEYS = ['low', 'medium', 'high', 'critical'];

// ─── Спільні колонки таблиці ──────────────────────────────────────────────────

function buildColumns({ onEdit, onComplete, onDismiss, showTruck = true, t }) {
  const cols = [];

  if (showTruck) {
    cols.push({
      title: t('maintenance.truckColumn'),
      dataIndex: 'truck_display',
      key: 'truck',
      width: 150,
      render: (v, row) => <Link to={`/trucks/${row.truck}`}>{v}</Link>,
    });
  }

  cols.push(
    {
      title: t('maintenance.nameColumn'),
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
      title: t('maintenance.statusColumn'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v) => <Tag color={STATUS_COLOR[v]}>{t(`reminderStatuses.${v}`)}</Tag>,
    },
    {
      title: t('maintenance.priorityColumn'),
      dataIndex: 'priority',
      key: 'priority',
      width: 110,
      render: (v) => <Tag color={PRIORITY_COLOR[v]}>{t(`reminderPriorities.${v}`)}</Tag>,
    },
    {
      title: t('maintenance.targetColumn'),
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
              {diff < 0 && <span> ({t('maintenance.daysAgo', { count: Math.abs(diff) })})</span>}
              {diff >= 0 && diff <= 30 && <span> ({t('maintenance.daysIn', { count: diff })})</span>}
            </div>
          );
        }
        if (row.target_mileage) {
          parts.push(
            <div key="km" style={{ color: '#555' }}>
              🛣 {row.target_mileage.toLocaleString('uk')} {t('common.km')}
            </div>
          );
        }
        return parts.length ? parts : '—';
      },
    },
    {
      title: t('maintenance.lastNotification'),
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
                title={t('maintenance.markCompleted')}
                onConfirm={() => onComplete(row.id)}
                okText={t('common.yes')} cancelText={t('common.no')}
              >
                <Button size="small" icon={<CheckOutlined />} style={{ color: 'green', borderColor: 'green' }} />
              </Popconfirm>
              <Popconfirm
                title={t('maintenance.dismissReminder')}
                onConfirm={() => onDismiss(row.id)}
                okText={t('common.yes')} cancelText={t('common.no')}
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
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const reminderType = Form.useWatch('reminder_type', form);

  const REMINDER_TYPE_OPTIONS = [
    { value: 'mileage', label: t('trucks.byMileage') },
    { value: 'date',    label: t('trucks.byDate') },
    { value: 'both',    label: t('trucks.byMileageOrDate') },
  ];
  const PRIORITY_OPTIONS = PRIORITY_KEYS.map(k => ({ value: k, label: t(`reminderPriorities.${k}`) }));
  const NOTIFY_FREQ_OPTIONS = [
    { value: 1,  label: t('trucks.daily') },
    { value: 2,  label: t('trucks.every2days') },
    { value: 3,  label: t('trucks.every3days') },
    { value: 7,  label: t('trucks.weekly') },
    { value: 14, label: t('trucks.biweekly') },
  ];

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
        message.success(t('trucks.reminderUpdated'));
      } else {
        await maintenanceAPI.createReminder(values);
        message.success(t('trucks.reminderCreated'));
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err?.response?.data) {
        const detail = Object.values(err.response.data).flat().join(' ');
        message.error(detail || t('trucks.reminderSaveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editingRecord ? t('maintenance.editReminder') : t('maintenance.newReminder')}
      open={open}
      onOk={handleSave}
      onCancel={onClose}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      okButtonProps={{ loading: saving, style: { background: Y, color: INK, borderColor: Y } }}
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="truck" label={t('common.truck')} rules={[{ required: true, message: t('maintenance.selectTruck') }]}>
          <Select
            showSearch
            placeholder={t('maintenance.selectTruck')}
            optionFilterProp="label"
            options={trucks.map(tr => ({ value: tr.id, label: `${tr.license_plate} — ${tr.specific_model_name || ''}` }))}
          />
        </Form.Item>

        <Form.Item name="title" label={t('common.name')} rules={[{ required: true, message: t('maintenance.namePlaceholder') }]}>
          <Input placeholder={t('maintenance.nameExample')} maxLength={200} />
        </Form.Item>

        <Form.Item name="service_type" label={t('maintenance.serviceType')}>
          <Select
            allowClear
            placeholder={t('maintenance.selectServiceType')}
            options={serviceTypes.map(st => ({ value: st.id, label: st.name }))}
          />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="reminder_type" label={t('maintenance.reminderType')} rules={[{ required: true }]}>
              <Select options={REMINDER_TYPE_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="priority" label={t('maintenance.priorityColumn')} rules={[{ required: true }]}>
              <Select options={PRIORITY_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>

        {['mileage', 'both'].includes(reminderType) && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="target_mileage" label={t('maintenance.targetMileage')}>
                <InputNumber min={0} step={1000} style={{ width: '100%' }} addonAfter={t('common.km')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="interval_km" label={t('maintenance.mileageInterval')}>
                <InputNumber min={0} step={1000} style={{ width: '100%' }} addonAfter={t('common.km')} placeholder={t('maintenance.fromServiceType')} />
              </Form.Item>
            </Col>
          </Row>
        )}

        {['date', 'both'].includes(reminderType) && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="target_date" label={t('maintenance.targetDate')}>
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="interval_months" label={t('maintenance.monthInterval')}>
                <InputNumber min={1} max={60} style={{ width: '100%' }} addonAfter={t('maintenance.monthInterval')} placeholder={t('maintenance.fromServiceType')} />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Form.Item name="notify_frequency_days" label={t('maintenance.repeatFrequency')}>
          <Select options={NOTIFY_FREQ_OPTIONS} />
        </Form.Item>

        <Form.Item name="description" label={t('common.description')}>
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ─── Головна сторінка ─────────────────────────────────────────────────────────

export default function RemindersPage() {
  const { t } = useTranslation();
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
      message.error(t('maintenance.loadError'));
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
      message.success(t('maintenance.completedSuccess'));
      fetch(page);
    } catch { message.error(t('common.error')); }
  };

  const handleDismiss = async (id) => {
    try {
      await maintenanceAPI.dismissReminder(id);
      message.success(t('maintenance.dismissedSuccess'));
      fetch(page);
    } catch { message.error(t('common.error')); }
  };

  const STATUS_OPTIONS = STATUS_KEYS.map(k => ({ value: k, label: t(`reminderStatuses.${k}`) }));
  const PRIORITY_OPTIONS = PRIORITY_KEYS.map(k => ({ value: k, label: t(`reminderPriorities.${k}`) }));

  const columns = buildColumns({
    onEdit: (r) => { setEditing(r); setModalOpen(true); },
    onComplete: handleComplete,
    onDismiss: handleDismiss,
    showTruck: true,
    t,
  });

  const activeData = reminders.filter(r => !['completed', 'dismissed'].includes(r.status));
  const allData    = reminders;

  const tabItems = [
    {
      key: 'active',
      label: (
        <Space>
          <BellOutlined />
          {t('maintenance.activeTab')}
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
            showTotal: (tot) => `${t('common.total')}: ${tot}`,
            onChange: setPage,
          }}
        />
      ),
    },
    {
      key: 'all',
      label: t('maintenance.allTab'),
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
            showTotal: (tot) => `${t('common.total')}: ${tot}`,
            onChange: setPage,
          }}
        />
      ),
    },
  ];

  if (moduleUnavailable) return <ModuleUnavailableBanner moduleName={t('maintenance.title')} />;

  return (
    <div style={{ paddingBottom: 24 }}>
      <PageHeader
        title={t('maintenance.subtitle')}
        subtitle={t('maintenance.description')}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setEditing(null); setModalOpen(true); }}
            style={{ background: Y, color: INK, borderColor: Y, fontWeight: 600 }}
          >
            {t('maintenance.addReminder')}
          </Button>
        }
      />

      {/* Статистика */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card size="small" style={{ borderTop: `3px solid red` }}>
            <Statistic
              title={t('maintenance.overdueCount')}
              value={overdue}
              prefix={<WarningOutlined style={{ color: 'red' }} />}
              valueStyle={{ color: 'red' }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" style={{ borderTop: `3px solid #faad14` }}>
            <Statistic
              title={t('maintenance.notifiedCount')}
              value={notified}
              prefix={<BellOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" style={{ borderTop: `3px solid #1677ff` }}>
            <Statistic
              title={t('maintenance.pendingCount')}
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
          placeholder={t('maintenance.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear
          style={{ width: 220 }}
        />
        <Select
          placeholder={t('common.status')}
          value={statusFilter || undefined}
          onChange={v => setStatus(v || '')}
          options={[{ value: '', label: t('common.allStatuses') }, ...STATUS_OPTIONS]}
          style={{ width: 160 }}
          allowClear
        />
        <Select
          placeholder={t('maintenance.priorityColumn')}
          value={priorityFilter || undefined}
          onChange={v => setPriority(v || '')}
          options={[{ value: '', label: t('maintenance.allPriorities') }, ...PRIORITY_OPTIONS]}
          style={{ width: 160 }}
          allowClear
        />
        <Button icon={<ReloadOutlined />} onClick={() => fetch(page)}>{t('common.refresh')}</Button>
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

    </div>
  );
}

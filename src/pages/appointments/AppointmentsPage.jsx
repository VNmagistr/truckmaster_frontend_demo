import React, { useState, useCallback, useRef } from 'react';
import { Calendar, dayjsLocalizer } from 'react-big-calendar';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import localeData from 'dayjs/plugin/localeData';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/uk';
import 'react-big-calendar/lib/css/react-big-calendar.css';

dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(localeData);
dayjs.extend(localizedFormat);
import {
  Button, Modal, Form, Input, Select, DatePicker, InputNumber,
  message, Tag, Space, Popconfirm, Typography, Flex, AutoComplete, Divider,
} from 'antd';
import { UserOutlined } from '@ant-design/icons';
import {
  PlusOutlined, CheckOutlined, CloseOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getAppointments, createAppointment, updateAppointment, deleteAppointment,
  confirmAppointment, cancelAppointment, completeAppointment,
  searchClients, getClientTrucks,
} from '../../api/appointments';

const { Title } = Typography;
const localizer = dayjsLocalizer(dayjs);

const Y = '#f5c518';
const INK = '#1a1a1a';

const SERVICE_COLORS = {
  diagnosis: '#1677ff',
  maintenance: '#52c41a',
  repair: Y,
  other: '#8c8c8c',
};

const SERVICE_TEXT_COLORS = {
  diagnosis: '#fff',
  maintenance: '#fff',
  repair: INK,
  other: '#fff',
};

const STATUS_COLORS = {
  pending: 'orange',
  confirmed: 'green',
  cancelled: 'red',
  completed: 'blue',
  no_show: 'default',
};

export default function AppointmentsPage() {
  const { t, i18n } = useTranslation();

  const SERVICE_TYPE_OPTIONS = [
    { value: 'diagnosis', label: t('appointments.typeDiagnostics') },
    { value: 'maintenance', label: t('appointments.typeMaintenance') },
    { value: 'repair', label: t('appointments.typeRepair') },
    { value: 'other', label: t('appointments.typeOther') },
  ];

  const STATUS_LABELS = {
    pending: t('appointments.statusPending'),
    confirmed: t('appointments.statusConfirmed'),
    cancelled: t('appointments.statusCanceled'),
    completed: t('appointments.statusCompleted'),
    no_show: t('appointments.statusNoShow'),
  };

  const MESSAGES = {
    allDay: t('appointments.allDay'),
    previous: '←',
    next: '→',
    today: t('appointments.today'),
    month: t('appointments.month'),
    week: t('appointments.week'),
    day: t('appointments.day'),
    agenda: t('appointments.listView'),
    date: t('common.date'),
    time: t('common.time'),
    event: t('appointments.event'),
    noEventsInRange: t('appointments.noEvents'),
    showMore: (total) => `+${total}`,
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();
  const [clientOptions, setClientOptions] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientTrucks, setClientTrucks] = useState([]);
  const searchTimer = useRef(null);
  const [calendarRange, setCalendarRange] = useState({
    start: dayjs().startOf('week').toISOString(),
    end: dayjs().endOf('week').toISOString(),
  });
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', calendarRange],
    queryFn: () => getAppointments({ start: calendarRange.start, end: calendarRange.end })
      .then(r => Array.isArray(r.data) ? r.data : (r.data?.results ?? [])),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['appointments'] });

  const createMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => { messageApi.success(t('appointments.createdSuccess')); invalidate(); closeModal(); },
    onError: () => messageApi.error(t('appointments.createdError')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAppointment(id, data),
    onSuccess: () => { messageApi.success(t('appointments.updatedSuccess')); invalidate(); closeModal(); },
    onError: () => messageApi.error(t('appointments.updatedError')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => { messageApi.success(t('appointments.deletedSuccess')); invalidate(); closeModal(); },
  });

  const confirmMutation = useMutation({
    mutationFn: confirmAppointment,
    onSuccess: () => { messageApi.success(t('appointments.confirmedSuccess')); invalidate(); closeModal(); },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => { messageApi.success(t('appointments.canceledSuccess')); invalidate(); closeModal(); },
  });

  const completeMutation = useMutation({
    mutationFn: completeAppointment,
    onSuccess: () => { messageApi.success(t('appointments.completedSuccess')); invalidate(); closeModal(); },
  });

  const openCreate = useCallback(() => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ duration_minutes: 60, service_type: 'repair', status: 'pending' });
    setModalOpen(true);
  }, [form]);

  const openEdit = useCallback(async (appt) => {
    setEditingId(appt.id);
    setSelectedClient(appt.client ? { id: appt.client, name: appt.client_name } : null);
    form.setFieldsValue({
      client: appt.client,
      client_name: appt.client_name,
      client_phone: appt.client_phone,
      license_plate: appt.license_plate,
      scheduled_dt: dayjs(appt.scheduled_dt),
      duration_minutes: appt.duration_minutes,
      service_type: appt.service_type,
      description: appt.description,
      status: appt.status,
    });
    if (appt.client) {
      try {
        const res = await getClientTrucks(appt.client);
        setClientTrucks(res.data?.results ?? res.data ?? []);
      } catch { setClientTrucks([]); }
    }
    setModalOpen(true);
  }, [form]);

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    form.resetFields();
    setSelectedClient(null);
    setClientOptions([]);
    setClientTrucks([]);
  };

  const handleClientSearch = (value) => {
    clearTimeout(searchTimer.current);
    if (!value || value.length < 2) { setClientOptions([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await searchClients(value);
        const list = res.data?.results ?? res.data ?? [];
        setClientOptions(list.map(c => ({
          value: c.name,
          label: (
            <Flex justify="space-between">
              <span><UserOutlined style={{ marginRight: 6 }} />{c.name}</span>
              <span style={{ color: '#888', fontSize: 12 }}>{c.phone}</span>
            </Flex>
          ),
          client: c,
        })));
      } catch { setClientOptions([]); }
    }, 300);
  };

  const handleClientSelect = async (_, option) => {
    const c = option.client;
    setSelectedClient(c);
    form.setFieldsValue({ client_name: c.name, client_phone: c.phone || '', client: c.id });
    try {
      const res = await getClientTrucks(c.id);
      const trucks = res.data?.results ?? res.data ?? [];
      setClientTrucks(trucks);
      if (trucks.length === 1) form.setFieldsValue({ license_plate: trucks[0].license_plate });
    } catch { setClientTrucks([]); }
  };

  const handleClientClear = () => {
    setSelectedClient(null);
    setClientTrucks([]);
    form.setFieldsValue({ client_name: '', client_phone: '', license_plate: '', client: null });
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      const data = {
        ...values,
        scheduled_dt: values.scheduled_dt.toISOString(),
      };
      if (editingId) {
        updateMutation.mutate({ id: editingId, data });
      } else {
        createMutation.mutate(data);
      }
    });
  };

  const events = appointments.map(a => ({
    id: a.id,
    title: `${a.license_plate} — ${a.client_name}`,
    start: new Date(a.scheduled_dt),
    end: new Date(a.end_dt || dayjs(a.scheduled_dt).add(a.duration_minutes, 'minute').toDate()),
    resource: a,
  }));

  const handleRangeChange = useCallback((range) => {
    if (Array.isArray(range)) {
      setCalendarRange({
        start: dayjs(range[0]).startOf('day').toISOString(),
        end: dayjs(range[range.length - 1]).endOf('day').toISOString(),
      });
    } else if (range.start && range.end) {
      setCalendarRange({
        start: dayjs(range.start).toISOString(),
        end: dayjs(range.end).toISOString(),
      });
    }
  }, []);

  const eventStyleGetter = useCallback((event) => {
    const appt = event.resource;
    const bg = SERVICE_COLORS[appt.service_type] || '#8c8c8c';
    const color = SERVICE_TEXT_COLORS[appt.service_type] || '#fff';
    const opacity = appt.status === 'cancelled' ? 0.45 : appt.status === 'completed' ? 0.7 : 1;
    return {
      style: {
        backgroundColor: bg,
        color,
        border: 'none',
        borderRadius: 4,
        opacity,
        fontSize: 12,
        padding: '2px 6px',
      },
    };
  }, []);

  const currentAppt = editingId ? appointments.find(a => a.id === editingId) : null;

  return (
    <div style={{ padding: '0 0 24px' }}>
      {contextHolder}
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{t('appointments.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('appointments.newAppointment')}
        </Button>
      </Flex>

      {/* Legend */}
      <Flex gap={8} wrap="wrap" style={{ marginBottom: 12 }}>
        {SERVICE_TYPE_OPTIONS.map(s => (
          <Tag key={s.value} color={SERVICE_COLORS[s.value]}
               style={{ color: SERVICE_TEXT_COLORS[s.value] }}>
            {s.label}
          </Tag>
        ))}
      </Flex>

      <div style={{
        background: '#fff',
        borderRadius: 8,
        borderTop: `4px solid ${Y}`,
        padding: 16,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}>
        <Calendar
          localizer={localizer}
          events={events}
          defaultView="week"
          views={['month', 'week', 'day', 'agenda']}
          messages={MESSAGES}
          culture={i18n.language}
          style={{ height: 620 }}
          onRangeChange={handleRangeChange}
          onSelectEvent={(event) => openEdit(event.resource)}
          onSelectSlot={({ start }) => {
            form.setFieldsValue({ scheduled_dt: dayjs(start), duration_minutes: 60, service_type: 'repair', status: 'pending' });
            setEditingId(null);
            setModalOpen(true);
          }}
          selectable
          eventPropGetter={eventStyleGetter}
          popup
        />
      </div>

      <Modal
        open={modalOpen}
        onCancel={closeModal}
        title={editingId ? t('appointments.editAppointment') : t('appointments.newAppointmentFull')}
        width={560}
        footer={
          <Flex justify="space-between" align="center">
            <Space>
              {editingId && currentAppt && (
                <>
                  {currentAppt.status === 'pending' && (
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => confirmMutation.mutate(editingId)}
                      loading={confirmMutation.isPending}
                    >
                      {t('appointments.confirm')}
                    </Button>
                  )}
                  {!['cancelled', 'completed'].includes(currentAppt.status) && (
                    <Button
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => cancelMutation.mutate(editingId)}
                      loading={cancelMutation.isPending}
                    >
                      {t('common.cancel')}
                    </Button>
                  )}
                  {currentAppt.status === 'confirmed' && (
                    <Button
                      icon={<CheckCircleOutlined />}
                      onClick={() => completeMutation.mutate(editingId)}
                      loading={completeMutation.isPending}
                    >
                      {t('appointments.complete')}
                    </Button>
                  )}
                </>
              )}
            </Space>
            <Space>
              {editingId && (
                <Popconfirm
                  title={t('appointments.deleteConfirm')}
                  onConfirm={() => deleteMutation.mutate(editingId)}
                >
                  <Button danger>{t('common.delete')}</Button>
                </Popconfirm>
              )}
              <Button onClick={closeModal}>{t('common.cancel')}</Button>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {t('common.save')}
              </Button>
            </Space>
          </Flex>
        }
      >
        {currentAppt && (
          <div style={{ marginBottom: 12 }}>
            <Tag color={STATUS_COLORS[currentAppt.status]}>
              {STATUS_LABELS[currentAppt.status]}
            </Tag>
            {currentAppt.confirmation_sent && <Tag color="cyan">{t('appointments.confirmSent')}</Tag>}
            {currentAppt.reminder_sent && <Tag color="purple">{t('appointments.reminderSent')}</Tag>}
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item name="client" hidden><Input /></Form.Item>

          {/* Client search */}
          <Form.Item label={t('appointments.searchClient')}>
            <AutoComplete
              options={clientOptions}
              onSearch={handleClientSearch}
              onSelect={handleClientSelect}
              onClear={handleClientClear}
              allowClear
              placeholder={t('appointments.searchClientPlaceholder')}
              style={{ width: '100%' }}
              filterOption={false}
            />
          </Form.Item>

          {selectedClient && (
            <div style={{ marginBottom: 12, padding: '6px 10px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4, fontSize: 13 }}>
              {t('appointments.clientFound', { name: selectedClient.name })}
            </div>
          )}

          <Divider style={{ margin: '4px 0 12px', fontSize: 12, color: '#aaa' }}>
            {selectedClient ? t('appointments.autoFilled') : t('appointments.orManual')}
          </Divider>

          <Flex gap={12}>
            <Form.Item name="client_name" label={t('appointments.clientName')} style={{ flex: 1 }}
              rules={[{ required: true, message: t('appointments.clientNamePlaceholder') }]}>
              <Input placeholder={t('appointments.clientNamePlaceholder')} />
            </Form.Item>
            <Form.Item name="client_phone" label={t('common.phone')} style={{ flex: 1 }}
              rules={[{ required: true, message: t('appointments.phonePlaceholder') }]}>
              <Input placeholder="+380 XX XXX XXXX" />
            </Form.Item>
          </Flex>

          <Form.Item name="license_plate" label={t('appointments.plateNumber')}
            rules={[{ required: true, message: t('appointments.platePlaceholder') }]}>
            {clientTrucks.length > 0 ? (
              <Select
                placeholder={t('appointments.selectTruck')}
                options={clientTrucks.map(tr => ({
                  value: tr.license_plate,
                  label: `${tr.license_plate} — ${tr.specific_model_name}`,
                }))}
              />
            ) : (
              <Input placeholder="AA 1234 BB" style={{ textTransform: 'uppercase' }} />
            )}
          </Form.Item>

          <Flex gap={12}>
            <Form.Item name="scheduled_dt" label={t('appointments.dateTime')} style={{ flex: 1 }}
              rules={[{ required: true, message: t('appointments.dateTimePlaceholder') }]}>
              <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="duration_minutes" label={t('appointments.duration')} style={{ flex: 1 }}>
              <InputNumber min={15} max={480} step={15} style={{ width: '100%' }} />
            </Form.Item>
          </Flex>

          <Form.Item name="service_type" label={t('appointments.serviceType')}>
            <Select options={SERVICE_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="description" label={t('appointments.comment')}>
            <Input.TextArea rows={3} placeholder={t('appointments.commentPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

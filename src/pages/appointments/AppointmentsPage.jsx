import React, { useState, useCallback } from 'react';
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
dayjs.locale('uk');
import {
  Button, Modal, Form, Input, Select, DatePicker, InputNumber,
  message, Tag, Space, Popconfirm, Typography, Flex,
} from 'antd';
import {
  PlusOutlined, CheckOutlined, CloseOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAppointments, createAppointment, updateAppointment, deleteAppointment,
  confirmAppointment, cancelAppointment, completeAppointment,
} from '../../api/appointments';

const { Title } = Typography;
const localizer = dayjsLocalizer(dayjs);

const Y = '#f5c518';
const INK = '#1a1a1a';

const SERVICE_TYPE_OPTIONS = [
  { value: 'diagnosis', label: 'Діагностика' },
  { value: 'maintenance', label: 'Технічне обслуговування' },
  { value: 'repair', label: 'Ремонт' },
  { value: 'other', label: 'Інше' },
];

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

const STATUS_LABELS = {
  pending: 'Очікує',
  confirmed: 'Підтверджено',
  cancelled: 'Скасовано',
  completed: 'Завершено',
  no_show: 'Не з\'явився',
};

const MESSAGES = {
  allDay: 'Весь день',
  previous: '←',
  next: '→',
  today: 'Сьогодні',
  month: 'Місяць',
  week: 'Тиждень',
  day: 'День',
  agenda: 'Список',
  date: 'Дата',
  time: 'Час',
  event: 'Запис',
  noEventsInRange: 'Немає записів у цьому діапазоні',
  showMore: (total) => `+${total} ще`,
};

export default function AppointmentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();
  const [calendarRange, setCalendarRange] = useState({
    start: dayjs().startOf('week').toISOString(),
    end: dayjs().endOf('week').toISOString(),
  });
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', calendarRange],
    queryFn: () => getAppointments({ start: calendarRange.start, end: calendarRange.end })
      .then(r => r.data),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['appointments'] });

  const createMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => { messageApi.success('Запис створено'); invalidate(); closeModal(); },
    onError: () => messageApi.error('Помилка при створенні'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAppointment(id, data),
    onSuccess: () => { messageApi.success('Запис оновлено'); invalidate(); closeModal(); },
    onError: () => messageApi.error('Помилка при оновленні'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => { messageApi.success('Запис видалено'); invalidate(); closeModal(); },
  });

  const confirmMutation = useMutation({
    mutationFn: confirmAppointment,
    onSuccess: () => { messageApi.success('Запис підтверджено'); invalidate(); closeModal(); },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => { messageApi.success('Запис скасовано'); invalidate(); closeModal(); },
  });

  const completeMutation = useMutation({
    mutationFn: completeAppointment,
    onSuccess: () => { messageApi.success('Запис завершено'); invalidate(); closeModal(); },
  });

  const openCreate = useCallback(() => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ duration_minutes: 60, service_type: 'repair', status: 'pending' });
    setModalOpen(true);
  }, [form]);

  const openEdit = useCallback((appt) => {
    setEditingId(appt.id);
    form.setFieldsValue({
      client_name: appt.client_name,
      client_phone: appt.client_phone,
      license_plate: appt.license_plate,
      scheduled_dt: dayjs(appt.scheduled_dt),
      duration_minutes: appt.duration_minutes,
      service_type: appt.service_type,
      description: appt.description,
      status: appt.status,
    });
    setModalOpen(true);
  }, [form]);

  const closeModal = () => { setModalOpen(false); setEditingId(null); form.resetFields(); };

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
        <Title level={4} style={{ margin: 0 }}>Записи на СТО</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Новий запис
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
          culture="uk"
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
        title={editingId ? 'Редагувати запис' : 'Новий запис на СТО'}
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
                      Підтвердити
                    </Button>
                  )}
                  {!['cancelled', 'completed'].includes(currentAppt.status) && (
                    <Button
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => cancelMutation.mutate(editingId)}
                      loading={cancelMutation.isPending}
                    >
                      Скасувати
                    </Button>
                  )}
                  {currentAppt.status === 'confirmed' && (
                    <Button
                      icon={<CheckCircleOutlined />}
                      onClick={() => completeMutation.mutate(editingId)}
                      loading={completeMutation.isPending}
                    >
                      Завершено
                    </Button>
                  )}
                </>
              )}
            </Space>
            <Space>
              {editingId && (
                <Popconfirm
                  title="Видалити запис?"
                  onConfirm={() => deleteMutation.mutate(editingId)}
                >
                  <Button danger>Видалити</Button>
                </Popconfirm>
              )}
              <Button onClick={closeModal}>Відмінити</Button>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={createMutation.isPending || updateMutation.isPending}
              >
                Зберегти
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
            {currentAppt.confirmation_sent && <Tag color="cyan">Підтвердження надіслано</Tag>}
            {currentAppt.reminder_sent && <Tag color="purple">Нагадування надіслано</Tag>}
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item name="client_name" label="Ім'я клієнта"
            rules={[{ required: true, message: 'Вкажіть ім\'я клієнта' }]}>
            <Input placeholder="Іван Петренко" />
          </Form.Item>
          <Form.Item name="client_phone" label="Телефон"
            rules={[{ required: true, message: 'Вкажіть телефон' }]}>
            <Input placeholder="+380 XX XXX XXXX" />
          </Form.Item>
          <Form.Item name="license_plate" label="Держномер авто"
            rules={[{ required: true, message: 'Вкажіть держномер' }]}>
            <Input placeholder="AA 1234 BB" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Space size={12} style={{ width: '100%' }}>
            <Form.Item name="scheduled_dt" label="Дата та час"
              rules={[{ required: true, message: 'Вкажіть дату та час' }]}
              style={{ flex: 1, marginBottom: 0 }}>
              <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="duration_minutes" label="Тривалість (хв)" style={{ flex: 1, marginBottom: 0 }}>
              <InputNumber min={15} max={480} step={15} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="service_type" label="Тип послуги" style={{ marginTop: 16 }}>
            <Select options={SERVICE_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="description" label="Опис / коментар">
            <Input.TextArea rows={3} placeholder="Що потребує уваги..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

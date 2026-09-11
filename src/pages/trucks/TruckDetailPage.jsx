import React, { useState, useEffect, useMemo } from 'react';
import { Card, Descriptions, Button, Table, Tag, message, Tabs, Modal, Form, Select, Input, InputNumber, Space, Typography, Spin, Empty, Popconfirm, DatePicker, Row, Col } from 'antd';
import { EditOutlined, FileTextOutlined, ToolOutlined, PlusOutlined, HistoryOutlined, DashboardOutlined, BellOutlined, CheckOutlined, StopOutlined, QrcodeOutlined, DownloadOutlined } from '@ant-design/icons';
import { QRCodeCanvas } from 'qrcode.react';
import dayjs from 'dayjs';

function getIntervalTypes(transmissionType, t) {
  let gearboxItems;
  if (transmissionType === 'manual') {
    gearboxItems = [{ key: 'gearbox_oil', label: t('truckDetail.gearboxOil') }];
  } else if (transmissionType === 'automatic') {
    gearboxItems = [
      { key: 'auto_gearbox_oil',    label: t('truckDetail.autoGearboxOil') },
      { key: 'auto_gearbox_filter', label: t('truckDetail.autoGearboxFilter') },
    ];
  } else if (transmissionType === 'robotic') {
    gearboxItems = [
      { key: 'auto_gearbox_oil',    label: t('truckDetail.robotGearboxOil') },
      { key: 'auto_gearbox_filter', label: t('truckDetail.robotGearboxFilter') },
    ];
  } else {
    gearboxItems = [
      { key: 'gearbox_oil',      label: t('truckDetail.gearboxOil') },
      { key: 'auto_gearbox_oil', label: t('truckDetail.autoGearboxOil') },
    ];
  }
  return [
    { key: 'engine_oil',    label: t('truckDetail.engineOil') },
    ...gearboxItems,
    { key: 'rear_axle_oil', label: t('truckDetail.rearAxleOil') },
    { key: 'belts',         label: t('truckDetail.belts') },
    { key: 'chains',        label: t('truckDetail.chains') },
  ];
}
import { useParams, useNavigate, Link } from 'react-router-dom';
import { trucksAPI, ordersAPI, baseModelsAPI, clientsAPI, maintenanceAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatDate } from '../../utils/formatters';
import useEnumsStore from '../../store/enumsStore';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

function TruckDetailPage() {
  const { t } = useTranslation();
  const euroByValue         = useEnumsStore((s) => s.euroByValue);
  const transmissionByValue = useEnumsStore((s) => s.transmissionByValue);

  const [truck, setTruck] = useState(null);
  const intervalTypes = useMemo(() => getIntervalTypes(truck?.transmission_type, t), [truck?.transmission_type, t]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [baseModelName, setBaseModelName] = useState(null);
  const [clientName, setClientName] = useState(null);

  const [kit, setKit] = useState(null);
  const [kitLoading, setKitLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [templateApplying, setTemplateApplying] = useState(false);

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const handleDownloadQr = () => {
    const canvas = document.getElementById('truck-qr-canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${truck?.license_plate || id}.png`;
    a.click();
  };


  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsLoaded, setLogsLoaded] = useState(false);

  const [formIntervals] = Form.useForm();

  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [remindersLoaded, setRemindersLoaded] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [formReminder] = Form.useForm();

  const [intervals, setIntervals] = useState(null);
  const [intervalsLoading, setIntervalsLoading] = useState(false);
  const [intervalsLoaded, setIntervalsLoaded] = useState(false);
  const [intervalsSaving, setIntervalsSaving] = useState(false);
  const [trackingMode, setTrackingMode] = useState('mileage');

  const isTrakker = useMemo(() => {
    const base = baseModelName || '';
    const specific = truck?.specific_model_name || '';
    return /trakker/i.test(base) || /trakker/i.test(specific);
  }, [baseModelName, truck?.specific_model_name]);

  const unitLabel = trackingMode === 'engine_hours' ? t('common.engineHoursShort') : t('common.km');

  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTruckData();
    loadKit();
  }, [id]);

  const fetchTruckData = async () => {
    setLoading(true);
    try {
      const [truckResponse, ordersResponse] = await Promise.all([
        trucksAPI.getById(id),
        ordersAPI.getAll({ truck: id, page_size: 20, ordering: '-created_at' }).catch(() => ({ data: [] })),
      ]);

      const truckData = truckResponse.data || truckResponse;
      const ordersData = ordersResponse.data || ordersResponse;

      setTruck(truckData);
      setOrders(ordersData.results || ordersData || []);

      // --- ЛОГІКА ДОВАНТАЖЕННЯ НАЗВ (якщо прийшли тільки ID) ---
      
      // 1. Базова модель
      if (truckData.base_model) {
        if (typeof truckData.base_model === 'object') {
          setBaseModelName(truckData.base_model.name);
        } else {
             baseModelsAPI.getAll().then(res => {
                 const models = res.data?.results || res.data || [];
                 const found = models.find(m => m.id === truckData.base_model);
                 if (found) setBaseModelName(found.name);
             }).catch(() => {});
        }
      }

      // 2. Клієнт
      if (truckData.client) {
        if (typeof truckData.client === 'object') {
          setClientName(truckData.client.name);
        } else {
          // Якщо прийшло ID клієнта, робимо запит за цим клієнтом
          clientsAPI.getById(truckData.client).then(res => {
              const cData = res.data || res;
              setClientName(cData.name);
          }).catch(() => {});
        }
      }

    } catch (error) {
      message.error(t('trucks.loadDetailError'));
      navigate('/trucks');
    } finally {
      setLoading(false);
    }
  };

  const loadKit = async () => {
    setKitLoading(true);
    try {
      const res = await maintenanceAPI.getKit(id);
      const data = res.data || res;
      const results = data.results || data || [];
      setKit(results.length > 0 ? results[0] : null);
    } catch {
      // не критично
    } finally {
      setKitLoading(false);
    }
  };

  const loadLogs = async () => {
    if (logsLoaded) return;
    setLogsLoading(true);
    try {
      const res = await maintenanceAPI.getLogs(id);
      const data = res.data || res;
      setLogs(data.results || data || []);
      setLogsLoaded(true);
    } catch {
      message.error(t('truckDetail.serviceHistoryError'));
    } finally {
      setLogsLoading(false);
    }
  };

  const loadIntervals = async () => {
    if (intervalsLoaded) return;
    setIntervalsLoading(true);
    try {
      const res = await maintenanceAPI.getIntervals(id);
      const data = res.data || res;
      const list = Array.isArray(data) ? data : (data.results || []);
      const rec = list.length > 0 ? list[0] : null;
      setIntervals(rec);
      const mode = rec?.tracking_mode || 'mileage';
      setTrackingMode(mode);
      if (rec) {
        const values = { tracking_mode: mode };
        intervalTypes.forEach(({ key }) => {
          values[`${key}_interval`] = rec[`${key}_interval`] ?? null;
          values[`${key}_last_km`]  = rec[`${key}_last_km`]  ?? null;
        });
        formIntervals.setFieldsValue(values);
      } else {
        formIntervals.setFieldsValue({ tracking_mode: mode });
      }
      setIntervalsLoaded(true);
    } catch {
      message.error(t('truckDetail.intervalsError'));
    } finally {
      setIntervalsLoading(false);
    }
  };

  const handleSaveIntervals = async (values) => {
    setIntervalsSaving(true);
    try {
      // Для не-Trakker примусово ставимо mileage (поле в формі може бути не показане)
      const payload = { ...values, tracking_mode: isTrakker ? (values.tracking_mode || trackingMode) : 'mileage' };
      await maintenanceAPI.saveIntervals(id, payload);
      message.success(t('truckDetail.intervalsSaved'));
      setIntervalsLoaded(false); // скинути кеш щоб наступне відкриття перезавантажило
    } catch {
      message.error(t('truckDetail.intervalsSaveError'));
    } finally {
      setIntervalsSaving(false);
    }
  };

  const loadReminders = async () => {
    if (remindersLoaded) return;
    setRemindersLoading(true);
    try {
      const res = await maintenanceAPI.getRemindersByTruck(id);
      setReminders(res.data || []);
      setRemindersLoaded(true);
    } catch {
      message.error(t('truckDetail.reminderLoadError'));
    } finally {
      setRemindersLoading(false);
    }
  };

  const reloadReminders = async () => {
    setRemindersLoading(true);
    try {
      const res = await maintenanceAPI.getRemindersByTruck(id);
      setReminders(res.data || []);
    } catch {} finally {
      setRemindersLoading(false);
    }
  };

  const handleReminderComplete = async (rid) => {
    try {
      await maintenanceAPI.completeReminder(rid);
      message.success(t('truckDetail.reminderCompleted'));
      reloadReminders();
    } catch { message.error(t('common.error')); }
  };

  const handleReminderDismiss = async (rid) => {
    try {
      await maintenanceAPI.dismissReminder(rid);
      message.success(t('truckDetail.reminderDismissed'));
      reloadReminders();
    } catch { message.error(t('common.error')); }
  };

  const openReminderModal = async (record = null) => {
    if (!serviceTypes.length) {
      maintenanceAPI.getServiceTypes().then(r => setServiceTypes(r.data?.results || r.data || [])).catch(() => {});
    }
    setEditingReminder(record);
    if (record) {
      formReminder.setFieldsValue({
        ...record,
        target_date: record.target_date ? dayjs(record.target_date) : null,
      });
    } else {
      formReminder.resetFields();
      formReminder.setFieldsValue({ reminder_type: 'both', priority: 'medium', notify_frequency_days: 7 });
    }
    setReminderModalOpen(true);
  };

  const handleSaveReminder = async () => {
    try {
      const values = await formReminder.validateFields();
      if (values.target_date) values.target_date = values.target_date.format('YYYY-MM-DD');
      values.truck = Number(id);
      if (editingReminder) {
        await maintenanceAPI.updateReminder(editingReminder.id, values);
        message.success(t('truckDetail.reminderUpdated'));
      } else {
        await maintenanceAPI.createReminder(values);
        message.success(t('truckDetail.reminderCreated'));
      }
      setReminderModalOpen(false);
      reloadReminders();
    } catch (err) {
      if (err?.response?.data) {
        const detail = Object.values(err.response.data).flat().join(' ');
        message.error(detail || t('truckDetail.reminderSaveError'));
      }
    }
  };

  const handleTabChange = (key) => {
    if (key === 'maintenance') loadTemplates();
    if (key === 'history') loadLogs();
    if (key === 'intervals') loadIntervals();
    if (key === 'reminders') loadReminders();
  };

  const loadTemplates = async () => {
    if (templates.length > 0) return;
    setTemplatesLoading(true);
    try {
      const res = await maintenanceAPI.getTemplates({ page_size: 200 });
      const data = res.data || res;
      setTemplates(data.results || data || []);
    } catch {
      message.error(t('truckDetail.templateError'));
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) return;
    setTemplateApplying(true);
    try {
      await maintenanceAPI.applyTemplateToTruck(selectedTemplateId, id);
      message.success(t('truckDetail.templateApplied'));
      setSelectedTemplateId(null);
      loadKit();
    } catch (error) {
      const detail = error.response?.data?.detail || t('truckDetail.templateError');
      message.error(detail);
    } finally {
      setTemplateApplying(false);
    }
  };

  const ordersColumns = [
    {
      title: t('orders.orderNumber'),
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text, record) => (
        <Link to={`/orders/${record.id}`}>{text || `#${record.id}`}</Link>
      ),
    },
    {
      title: t('truckDetail.problemDesc'),
      dataIndex: 'problem_description',
      key: 'problem',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => <StatusTag status={status} type="order" />,
    },
    {
      title: t('common.date'),
      dataIndex: 'created_at',
      key: 'date',
      render: (date) => formatDate(date),
    },
  ];

  if (loading) return <LoadingSpinner />;
  if (!truck) return null;

  const tabItems = [
    {
      key: 'orders',
      label: (
        <span>
          <FileTextOutlined />
          {t('truckDetail.ordersCount', { count: orders.length })}
        </span>
      ),
      children: (
        <Table
          columns={ordersColumns}
          dataSource={orders}
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: t('truckDetail.noOrders') }}
          footer={() => orders.length >= 20 ? <div style={{textAlign: 'center', color: '#999'}}>{t('truckDetail.last20')}</div> : null}
        />
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined />
          {t('truckDetail.serviceHistory')}
        </span>
      ),
      children: (
        <Spin spinning={logsLoading}>
          <Table
            columns={[
              {
                title: t('truckDetail.serviceDate'),
                dataIndex: 'date_performed',
                key: 'date',
                width: 120,
                render: (d) => formatDate(d),
              },
              {
                title: t('truckDetail.serviceType'),
                dataIndex: 'rule_name',
                key: 'rule',
              },
              {
                title: t('truckDetail.serviceMileage'),
                dataIndex: 'mileage',
                key: 'mileage',
                width: 120,
                render: (v) => v ? `${v.toLocaleString()} ${t('common.km')}` : '—',
              },
            ]}
            dataSource={logs}
            rowKey="id"
            pagination={false}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: t('truckDetail.noServiceHistory') }}
          />
        </Spin>
      ),
    },
    {
      key: 'maintenance',
      label: (
        <span>
          <ToolOutlined />
          {t('truckDetail.maintenanceKit')}
        </span>
      ),
      children: (
        <Spin spinning={kitLoading}>
          <Card size="small" title={t('truckDetail.applyTemplate')} style={{ marginBottom: 16 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Select
                showSearch
                allowClear
                placeholder={t('truckDetail.selectTemplate')}
                loading={templatesLoading}
                optionFilterProp="label"
                value={selectedTemplateId}
                onChange={setSelectedTemplateId}
                onFocus={loadTemplates}
                style={{ flex: 1 }}
                options={templates.map(tpl => {
                  const euro = euroByValue?.[tpl.euro_standard]?.label || tpl.euro_standard || t('truckDetail.anyEuro');
                  const trans = transmissionByValue?.[tpl.transmission_type]?.label || tpl.transmission_type || t('truckDetail.anyTransmission');
                  return {
                    value: tpl.id,
                    label: `${tpl.base_model_name} / ${euro} / ${trans}`,
                  };
                })}
              />
              <Button
                type="primary"
                loading={templateApplying}
                disabled={!selectedTemplateId}
                onClick={handleApplyTemplate}
              >
                {t('truckDetail.apply')}
              </Button>
            </Space.Compact>
          </Card>

          {kit ? (
            <div>
              <Card size="small" title={t('truckDetail.oils')} style={{ marginBottom: 16 }}>
                <Descriptions size="small" column={1} bordered>
                  {kit.oil_name && (
                    <Descriptions.Item label={t('truckDetail.engineOil')}>
                      [{kit.oil_sku}] {kit.oil_name} — {kit.oil_quantity} {t('common.lShort')}
                    </Descriptions.Item>
                  )}
                  {kit.rear_axle_oil_name && (
                    <Descriptions.Item label={t('truckDetail.rearAxleOil')}>
                      [{kit.rear_axle_oil_sku}] {kit.rear_axle_oil_name} — {kit.rear_axle_oil_quantity} {t('common.lShort')}
                    </Descriptions.Item>
                  )}
                  {kit.gearbox_oil_name && (
                    <Descriptions.Item label={t('truckDetail.gearboxOil')}>
                      [{kit.gearbox_oil_sku}] {kit.gearbox_oil_name} — {kit.gearbox_oil_quantity} {t('common.lShort')}
                    </Descriptions.Item>
                  )}
                  {kit.auto_gearbox_oil_name && (
                    <Descriptions.Item label={t('truckDetail.autoGearboxOil')}>
                      [{kit.auto_gearbox_oil_sku}] {kit.auto_gearbox_oil_name} — {kit.auto_gearbox_oil_quantity} {t('common.lShort')}
                    </Descriptions.Item>
                  )}
                  {kit.auto_gearbox_filter_name && (
                    <Descriptions.Item label={t('truckDetail.autoGearboxFilter')}>
                      [{kit.auto_gearbox_filter_sku}] {kit.auto_gearbox_filter_name} — {kit.auto_gearbox_filter_quantity} {t('common.pcsShort')}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>

              {kit.filters && kit.filters.length > 0 && (
                <Card size="small" title={t('truckDetail.filters')}>
                  <Table
                    dataSource={kit.filters}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    columns={[
                      {
                        title: t('truckDetail.part'),
                        key: 'part',
                        render: (_, record) => record.part_name
                          ? `[${record.part_sku}] ${record.part_name}`
                          : '-',
                      },
                      {
                        title: t('truckDetail.filterQty'),
                        dataIndex: 'quantity',
                        width: 80,
                      },
                      {
                        title: t('truckDetail.filterInterval'),
                        dataIndex: 'change_interval_km',
                        width: 120,
                        render: (val) => val ? `${val.toLocaleString()} ${t('common.km')}` : '—',
                      },
                    ]}
                  />
                </Card>
              )}
            </div>
          ) : (
            <Empty
              description={t('truckDetail.kitNotConfigured')}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Spin>
      ),
    },
    {
      key: 'reminders',
      label: (
        <span>
          <BellOutlined />
          {t('truckDetail.reminders')} {reminders.filter(r => r.status === 'overdue').length > 0 && (
            <Tag color="red" style={{ marginLeft: 4, padding: '0 4px' }}>
              {reminders.filter(r => r.status === 'overdue').length}
            </Tag>
          )}
        </span>
      ),
      children: (
        <Spin spinning={remindersLoading}>
          <div style={{ marginBottom: 12, textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openReminderModal()}
              style={{ background: '#f5c518', color: '#1a1a1a', borderColor: '#f5c518' }}
            >
              {t('truckDetail.addReminder')}
            </Button>
          </div>
          <Table
            rowKey="id"
            dataSource={reminders}
            size="small"
            pagination={false}
            scroll={{ x: 600 }}
            locale={{ emptyText: t('truckDetail.noReminders') }}
            rowClassName={(r) => r.status === 'overdue' ? 'row-overdue' : ''}
            columns={[
              {
                title: t('truckDetail.reminderName'),
                dataIndex: 'title',
                key: 'title',
                render: (v, row) => (
                  <Space direction="vertical" size={0}>
                    <span style={{ fontWeight: 500 }}>{v}</span>
                    {row.service_type_name && (
                      <Text type="secondary" style={{ fontSize: 12 }}>{row.service_type_name}</Text>
                    )}
                  </Space>
                ),
              },
              {
                title: t('truckDetail.reminderStatus'),
                dataIndex: 'status',
                key: 'status',
                width: 120,
                render: (v) => {
                  const map = { pending: 'blue', notified: 'orange', overdue: 'red', completed: 'green', dismissed: 'default' };
                  return <Tag color={map[v]}>{t(`reminderStatuses.${v}`) || v}</Tag>;
                },
              },
              {
                title: t('truckDetail.reminderTarget'),
                key: 'target',
                width: 160,
                render: (_, row) => (
                  <Space direction="vertical" size={0}>
                    {row.target_date && <span>📅 {dayjs(row.target_date).format('DD.MM.YYYY')}</span>}
                    {row.target_mileage && <span>🛣 {row.target_mileage.toLocaleString('uk')} {t('common.km')}</span>}
                  </Space>
                ),
              },
              {
                title: '',
                key: 'actions',
                width: 110,
                render: (_, row) => (
                  <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openReminderModal(row)} />
                    {!['completed', 'dismissed'].includes(row.status) && (
                      <>
                        <Popconfirm title={t('truckDetail.markCompleted')} onConfirm={() => handleReminderComplete(row.id)} okText={t('common.yes')} cancelText={t('common.no')}>
                          <Button size="small" icon={<CheckOutlined />} style={{ color: 'green', borderColor: 'green' }} />
                        </Popconfirm>
                        <Popconfirm title={t('truckDetail.dismiss')} onConfirm={() => handleReminderDismiss(row.id)} okText={t('common.yes')} cancelText={t('common.no')}>
                          <Button size="small" danger icon={<StopOutlined />} />
                        </Popconfirm>
                      </>
                    )}
                  </Space>
                ),
              },
            ]}
          />
        </Spin>
      ),
    },
    {
      key: 'intervals',
      label: (
        <span>
          <DashboardOutlined />
          {t('truckDetail.intervals')}
        </span>
      ),
      children: (
        <Spin spinning={intervalsLoading}>
          <Form form={formIntervals} layout="vertical" onFinish={handleSaveIntervals}>
            {isTrakker && (
              <Form.Item
                name="tracking_mode"
                label="Режим обліку"
                tooltip="Для спецтехніки Trakker регламент може вестись по пробігу або по мотогодинах"
                style={{ maxWidth: 360 }}
              >
                <Select
                  onChange={(v) => setTrackingMode(v)}
                  options={[
                    { value: 'mileage',      label: 'По кілометражу (км)' },
                    { value: 'engine_hours', label: 'По мотогодинах (мг)' },
                  ]}
                />
              </Form.Item>
            )}
            <Table
              dataSource={intervalTypes}
              rowKey="key"
              pagination={false}
              size="small"
              scroll={{ x: 500 }}
              columns={[
                {
                  title: 'Вид роботи',
                  dataIndex: 'label',
                  key: 'label',
                },
                {
                  title: `Інтервал (${unitLabel})`,
                  key: 'interval',
                  width: 180,
                  render: (_, record) => (
                    <Form.Item name={`${record.key}_interval`} noStyle>
                      <InputNumber
                        min={0}
                        step={trackingMode === 'engine_hours' ? 100 : 1000}
                        style={{ width: '100%' }}
                        addonAfter={unitLabel}
                        placeholder={trackingMode === 'engine_hours' ? 'напр. 500' : 'напр. 15000'}
                      />
                    </Form.Item>
                  ),
                },
                {
                  title: trackingMode === 'engine_hours'
                    ? 'Мотогодини останньої заміни (мг)'
                    : 'Пробіг останньої заміни (км)',
                  key: 'last_km',
                  width: 220,
                  render: (_, record) => (
                    <Form.Item name={`${record.key}_last_km`} noStyle>
                      <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        addonAfter={unitLabel}
                        placeholder={trackingMode === 'engine_hours' ? 'напр. 12500' : 'напр. 450000'}
                      />
                    </Form.Item>
                  ),
                },
              ]}
            />
            <Button
              type="primary"
              htmlType="submit"
              loading={intervalsSaving}
              style={{ marginTop: 16 }}
            >
              Зберегти інтервали
            </Button>
          </Form>
        </Spin>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={truck.license_plate}
        subtitle={truck.specific_model_name}
        showBack
        extra={
          <Space>
            <Button
              icon={<QrcodeOutlined />}
              onClick={() => setIsQrModalOpen(true)}
            >
              QR-код
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/trucks/${id}/edit`)}
            >
              Редагувати
            </Button>
          </Space>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="Номерний знак">
            <strong>{truck.license_plate}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Модель">
            {truck.specific_model_name}
          </Descriptions.Item>
          <Descriptions.Item label="Базова модель">
            {baseModelName || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Повний VIN">
            {truck.full_vin ? <code>{truck.full_vin}</code> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Останні 7 VIN">
            {truck.last_seven_vin ? <code>{truck.last_seven_vin}</code> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Євростандарт">
            {truck.euro_standard ? (
              <Tag color="blue">
                {euroByValue[truck.euro_standard]?.label || truck.euro_standard}
              </Tag>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Тип КПП">
            {truck.transmission_type ? (
              <Tag color="purple">
                {transmissionByValue[truck.transmission_type]?.label || truck.transmission_type}
              </Tag>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Власник">
             {clientName ? (
                <Link to={`/clients/${typeof truck.client === 'object' ? truck.client.id : truck.client}`}>
                    {clientName}
                </Link>
             ) : (
                 truck.client ? truck.client : '-'
             )}
          </Descriptions.Item>
          {truck.notes && (
            <Descriptions.Item label={t('truckDetail.notes')} span={3}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{truck.notes}</div>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card>
        <Tabs items={tabItems} onChange={handleTabChange} />
      </Card>

      {/* Модалка нагадування */}
      <Modal
        title={editingReminder ? 'Редагувати нагадування' : 'Нове нагадування'}
        open={reminderModalOpen}
        onOk={handleSaveReminder}
        onCancel={() => setReminderModalOpen(false)}
        okText="Зберегти"
        cancelText="Скасувати"
        okButtonProps={{ style: { background: '#f5c518', color: '#1a1a1a', borderColor: '#f5c518' } }}
        width={520}
        destroyOnClose
      >
        <Form form={formReminder} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="Назва" rules={[{ required: true, message: 'Введіть назву' }]}>
            <Input placeholder="напр. Заміна моторної оливи" maxLength={200} />
          </Form.Item>
          <Form.Item name="service_type" label="Тип ТО">
            <Select allowClear placeholder="Оберіть тип (необов'язково)"
              options={serviceTypes.map(t => ({ value: t.id, label: t.name }))} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="reminder_type" label="Тип" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'mileage', label: 'За пробігом' },
                  { value: 'date', label: 'За датою' },
                  { value: 'both', label: 'За пробігом або датою' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="Пріоритет" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'low', label: 'Низький' },
                  { value: 'medium', label: 'Середній' },
                  { value: 'high', label: 'Високий' },
                  { value: 'critical', label: 'Критичний' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="target_mileage" label="Цільовий пробіг">
                <InputNumber min={0} step={1000} style={{ width: '100%' }} addonAfter="км" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="target_date" label="Цільова дата">
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notify_frequency_days" label="Частота повторення">
            <Select options={[
              { value: 1, label: 'Щодня' },
              { value: 2, label: 'Кожні 2 дні' },
              { value: 3, label: 'Кожні 3 дні' },
              { value: 7, label: 'Раз на тиждень' },
              { value: 14, label: 'Раз на 2 тижні' },
            ]} />
          </Form.Item>
          <Form.Item name="description" label="Опис">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>


      {/* QR Code Modal */}
      <Modal
        title={<span><QrcodeOutlined style={{ marginRight: 8 }} />QR-код вантажівки</span>}
        open={isQrModalOpen}
        onCancel={() => setIsQrModalOpen(false)}
        footer={[
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={handleDownloadQr}>
            Завантажити PNG
          </Button>,
          <Button key="close" onClick={() => setIsQrModalOpen(false)}>Закрити</Button>,
        ]}
        width={320}
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <QRCodeCanvas
            id="truck-qr-canvas"
            value={`https://ital-truck.com.ua/truck-info/${truck?.id}`}
            size={220}
            includeMargin
          />
          <p style={{ marginTop: 12, color: '#666', fontSize: 13 }}>
            {truck?.license_plate} — {truck?.make} {truck?.model}
          </p>
          <p style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
            Наклейте на дверцята кабіни
          </p>
        </div>
      </Modal>
    </div>
  );
}

export default TruckDetailPage;
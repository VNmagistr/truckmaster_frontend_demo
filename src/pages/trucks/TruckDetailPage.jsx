import React, { useState, useEffect, useMemo } from 'react';
import { Card, Descriptions, Button, Table, Tag, message, Tabs, Modal, Form, Select, Input, InputNumber, Space, Typography, Spin, Empty, Popconfirm, DatePicker, Row, Col } from 'antd';
import { EditOutlined, FileTextOutlined, ToolOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined, HistoryOutlined, DashboardOutlined, BellOutlined, CheckOutlined, StopOutlined, QrcodeOutlined, DownloadOutlined } from '@ant-design/icons';
import { QRCodeCanvas } from 'qrcode.react';
import dayjs from 'dayjs';

function getIntervalTypes(transmissionType) {
  let gearboxItems;
  if (transmissionType === 'manual') {
    gearboxItems = [{ key: 'gearbox_oil', label: 'Олива КПП' }];
  } else if (transmissionType === 'automatic') {
    gearboxItems = [
      { key: 'auto_gearbox_oil',    label: 'Олива АКПП' },
      { key: 'auto_gearbox_filter', label: 'Фільтр АКПП' },
    ];
  } else if (transmissionType === 'robotic') {
    gearboxItems = [
      { key: 'auto_gearbox_oil',    label: 'Олива роботизованої КПП' },
      { key: 'auto_gearbox_filter', label: 'Фільтр роботизованої КПП' },
    ];
  } else {
    gearboxItems = [
      { key: 'gearbox_oil',      label: 'Олива КПП' },
      { key: 'auto_gearbox_oil', label: 'Олива АКПП' },
    ];
  }
  return [
    { key: 'engine_oil',    label: 'Олива двигуна' },
    ...gearboxItems,
    { key: 'rear_axle_oil', label: 'Олива заднього моста' },
    { key: 'belts',         label: 'Ремені/ролики' },
    { key: 'chains',        label: 'Ланцюги' },
  ];
}
import { useParams, useNavigate, Link } from 'react-router-dom';
import { trucksAPI, ordersAPI, baseModelsAPI, clientsAPI, maintenanceAPI, inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatDate } from '../../utils/formatters';
import useEnumsStore from '../../store/enumsStore';

const { Text } = Typography;

function TruckDetailPage() {
  const euroByValue         = useEnumsStore((s) => s.euroByValue);
  const transmissionByValue = useEnumsStore((s) => s.transmissionByValue);

  const [truck, setTruck] = useState(null);
  const intervalTypes = useMemo(() => getIntervalTypes(truck?.transmission_type), [truck?.transmission_type]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [baseModelName, setBaseModelName] = useState(null);
  const [clientName, setClientName] = useState(null);

  const [kit, setKit] = useState(null);
  const [kitLoading, setKitLoading] = useState(false);
  const [oilProducts, setOilProducts] = useState([]);
  const [filterProducts, setFilterProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

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

  const [isOilModalOpen, setIsOilModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [oilSaving, setOilSaving] = useState(false);
  const [filterSaving, setFilterSaving] = useState(false);

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsLoaded, setLogsLoaded] = useState(false);

  const [formOil] = Form.useForm();
  const [formFilter] = Form.useForm();
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

  const unitLabel = trackingMode === 'engine_hours' ? 'мг' : 'км';

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
      message.error('Не вдалося завантажити дані вантажівки');
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
      message.error('Не вдалося завантажити історію ТО');
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
      message.error('Не вдалося завантажити інтервали');
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
      message.success('Інтервали збережено');
      setIntervalsLoaded(false); // скинути кеш щоб наступне відкриття перезавантажило
    } catch {
      message.error('Помилка збереження інтервалів');
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
      message.error('Не вдалося завантажити нагадування');
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
      message.success('Позначено як виконане');
      reloadReminders();
    } catch { message.error('Помилка'); }
  };

  const handleReminderDismiss = async (rid) => {
    try {
      await maintenanceAPI.dismissReminder(rid);
      message.success('Відхилено');
      reloadReminders();
    } catch { message.error('Помилка'); }
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
        message.success('Оновлено');
      } else {
        await maintenanceAPI.createReminder(values);
        message.success('Нагадування створено');
      }
      setReminderModalOpen(false);
      reloadReminders();
    } catch (err) {
      if (err?.response?.data) {
        const detail = Object.values(err.response.data).flat().join(' ');
        message.error(detail || 'Помилка збереження');
      }
    }
  };

  const handleTabChange = (key) => {
    if (key === 'history') loadLogs();
    if (key === 'intervals') loadIntervals();
    if (key === 'reminders') loadReminders();
  };

  const loadOilProducts = async () => {
    if (oilProducts.length > 0) return;
    setProductsLoading(true);
    try {
      const res = await inventoryAPI.getAll({ page_size: 500, oil_only: 'true' });
      const data = res.data || res;
      setOilProducts(data.results || data || []);
    } catch {
      message.error('Не вдалося завантажити оливи');
    } finally {
      setProductsLoading(false);
    }
  };

  const loadFilterProducts = async () => {
    if (filterProducts.length > 0) return;
    setProductsLoading(true);
    try {
      const res = await inventoryAPI.getAll({ page_size: 500, filter_only: 'true' });
      const data = res.data || res;
      setFilterProducts(data.results || data || []);
    } catch {
      message.error('Не вдалося завантажити фільтри');
    } finally {
      setProductsLoading(false);
    }
  };

  const handleOpenOilModal = async () => {
    await loadOilProducts();
    if (kit) {
      formOil.setFieldsValue({
        oil: kit.oil?.id || kit.oil,
        oil_quantity: parseFloat(kit.oil_quantity) || 1,
        oil_change_interval_km: kit.oil_change_interval_km || null,
      });
    }
    setIsOilModalOpen(true);
  };

  const handleSaveOil = async (values) => {
    setOilSaving(true);
    try {
      const payload = {
        oil: values.oil,
        oil_quantity: values.oil_quantity,
        oil_change_interval_km: values.oil_change_interval_km || null,
      };
      if (kit) {
        await maintenanceAPI.updateKit(kit.id, payload);
        message.success('Оливу оновлено');
      } else {
        await maintenanceAPI.createKit({ truck: id, ...payload });
        message.success('Комплект ТО створено');
      }
      setIsOilModalOpen(false);
      formOil.resetFields();
      loadKit();
    } catch (error) {
      const detail = error.response?.data?.detail || error.response?.data?.oil?.[0] || 'Помилка збереження';
      message.error(detail);
    } finally {
      setOilSaving(false);
    }
  };

  const handleOpenFilterModal = async () => {
    await loadFilterProducts();
    setIsFilterModalOpen(true);
  };

  const handleAddFilter = async (values) => {
    setFilterSaving(true);
    try {
      await maintenanceAPI.addKitFilter(kit.id, {
        part: values.part,
        quantity: values.quantity,
        change_interval_km: values.change_interval_km || null,
      });
      message.success('Фільтр додано');
      setIsFilterModalOpen(false);
      formFilter.resetFields();
      loadKit();
    } catch (error) {
      const detail = error.response?.data?.detail || 'Помилка додавання фільтра';
      message.error(detail);
    } finally {
      setFilterSaving(false);
    }
  };

  const handleDeleteFilter = (filterId) => {
    Modal.confirm({
      title: 'Видалити фільтр?',
      icon: <ExclamationCircleOutlined />,
      okText: 'Видалити',
      okType: 'danger',
      cancelText: 'Скасувати',
      onOk: async () => {
        try {
          await maintenanceAPI.removeKitFilter(kit.id, filterId);
          message.success('Фільтр видалено');
          loadKit();
        } catch {
          message.error('Помилка видалення фільтра');
        }
      },
    });
  };

  const ordersColumns = [
    {
      title: '№ Замовлення',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text, record) => (
        <Link to={`/orders/${record.id}`}>{text || `#${record.id}`}</Link>
      ),
    },
    {
      title: 'Опис проблеми',
      dataIndex: 'problem_description',
      key: 'problem',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <StatusTag status={status} type="order" />,
    },
    {
      title: 'Дата',
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
          Історія замовлень ({orders.length})
        </span>
      ),
      children: (
        <Table
          columns={ordersColumns}
          dataSource={orders}
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'Немає замовлень' }}
          footer={() => orders.length >= 20 ? <div style={{textAlign: 'center', color: '#999'}}>Показано останні 20</div> : null}
        />
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined />
          Історія ТО
        </span>
      ),
      children: (
        <Spin spinning={logsLoading}>
          <Table
            columns={[
              {
                title: 'Дата',
                dataIndex: 'date_performed',
                key: 'date',
                width: 120,
                render: (d) => formatDate(d),
              },
              {
                title: 'Вид ТО',
                dataIndex: 'rule_name',
                key: 'rule',
              },
              {
                title: 'Пробіг',
                dataIndex: 'mileage',
                key: 'mileage',
                width: 120,
                render: (v) => v ? `${v.toLocaleString()} км` : '—',
              },
            ]}
            dataSource={logs}
            rowKey="id"
            pagination={false}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'Немає записів ТО' }}
          />
        </Spin>
      ),
    },
    {
      key: 'maintenance',
      label: (
        <span>
          <ToolOutlined />
          Комплект ТО
        </span>
      ),
      children: (
        <Spin spinning={kitLoading}>
          {kit ? (
            <div>
              {/* Олива */}
              <Card
                size="small"
                title="Олива"
                extra={
                  <Button size="small" icon={<EditOutlined />} onClick={handleOpenOilModal}>
                    Змінити
                  </Button>
                }
                style={{ marginBottom: 16 }}
              >
                <Space>
                  <Text strong>{kit.oil_name ? `[${kit.oil_sku}] ${kit.oil_name}` : '-'}</Text>
                  <Text type="secondary">—</Text>
                  <Text>{kit.oil_quantity} л</Text>
                  {kit.oil_change_interval_km && (
                    <>
                      <Text type="secondary">—</Text>
                      <Text type="secondary">кожні {kit.oil_change_interval_km.toLocaleString()} км</Text>
                    </>
                  )}
                </Space>
              </Card>

              {/* Фільтри */}
              <Card
                size="small"
                title="Фільтри"
                extra={
                  <Button size="small" icon={<PlusOutlined />} onClick={handleOpenFilterModal}>
                    Додати фільтр
                  </Button>
                }
              >
                {kit.filters && kit.filters.length > 0 ? (
                  <Table
                    dataSource={kit.filters}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    columns={[
                      {
                        title: 'Запчастина',
                        key: 'part',
                        render: (_, record) => record.part_name
                          ? `[${record.part_sku}] ${record.part_name}`
                          : '-',
                      },
                      {
                        title: 'К-сть',
                        dataIndex: 'quantity',
                        width: 80,
                      },
                      {
                        title: 'Інтервал',
                        dataIndex: 'change_interval_km',
                        width: 120,
                        render: (val) => val ? `${val.toLocaleString()} км` : '—',
                      },
                      {
                        title: '',
                        key: 'actions',
                        width: 48,
                        render: (_, record) => (
                          <Button
                            type="link"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDeleteFilter(record.id)}
                          />
                        ),
                      },
                    ]}
                  />
                ) : (
                  <Empty description="Фільтри не додано" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </div>
          ) : (
            <Empty
              description="Комплект ТО не налаштовано"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenOilModal}>
                Налаштувати комплект ТО
              </Button>
            </Empty>
          )}
        </Spin>
      ),
    },
    {
      key: 'reminders',
      label: (
        <span>
          <BellOutlined />
          Нагадування {reminders.filter(r => r.status === 'overdue').length > 0 && (
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
              Додати нагадування
            </Button>
          </div>
          <Table
            rowKey="id"
            dataSource={reminders}
            size="small"
            pagination={false}
            scroll={{ x: 600 }}
            locale={{ emptyText: 'Немає нагадувань' }}
            rowClassName={(r) => r.status === 'overdue' ? 'row-overdue' : ''}
            columns={[
              {
                title: 'Назва',
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
                title: 'Статус',
                dataIndex: 'status',
                key: 'status',
                width: 120,
                render: (v) => {
                  const map = { pending: 'blue', notified: 'orange', overdue: 'red', completed: 'green', dismissed: 'default' };
                  const labels = { pending: 'Очікує', notified: 'Сповіщено', overdue: 'Прострочено', completed: 'Виконано', dismissed: 'Відхилено' };
                  return <Tag color={map[v]}>{labels[v] || v}</Tag>;
                },
              },
              {
                title: 'Ціль',
                key: 'target',
                width: 160,
                render: (_, row) => (
                  <Space direction="vertical" size={0}>
                    {row.target_date && <span>📅 {dayjs(row.target_date).format('DD.MM.YYYY')}</span>}
                    {row.target_mileage && <span>🛣 {row.target_mileage.toLocaleString('uk')} км</span>}
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
                        <Popconfirm title="Позначити як виконане?" onConfirm={() => handleReminderComplete(row.id)} okText="Так" cancelText="Ні">
                          <Button size="small" icon={<CheckOutlined />} style={{ color: 'green', borderColor: 'green' }} />
                        </Popconfirm>
                        <Popconfirm title="Відхилити?" onConfirm={() => handleReminderDismiss(row.id)} okText="Так" cancelText="Ні">
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
          Інтервали регламенту
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
             {/* Використовуємо clientName, який ми довантажили */}
             {clientName ? (
                <Link to={`/clients/${typeof truck.client === 'object' ? truck.client.id : truck.client}`}>
                    {clientName}
                </Link>
             ) : (
                 truck.client ? truck.client : '-'
             )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Tabs items={tabItems} onChange={handleTabChange} />
      </Card>

      {/* Модалка оливи */}
      <Modal
        title={kit ? 'Змінити оливу' : 'Налаштувати комплект ТО'}
        open={isOilModalOpen}
        onCancel={() => { setIsOilModalOpen(false); formOil.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form form={formOil} layout="vertical" onFinish={handleSaveOil}>
          <Form.Item
            label="Олива"
            name="oil"
            rules={[{ required: true, message: 'Оберіть оливу' }]}
          >
            <Select
              showSearch
              placeholder="Оберіть оливу зі складу"
              loading={productsLoading}
              optionFilterProp="label"
              options={oilProducts.map(p => ({ value: p.id, label: `${p.name}${p.viscosity ? ' ' + p.viscosity : ''}` }))}
            />
          </Form.Item>
          <Form.Item
            label="Кількість (л)"
            name="oil_quantity"
            initialValue={10}
            rules={[{ required: true, message: 'Вкажіть кількість' }]}
          >
            <InputNumber min={0.1} step={0.5} style={{ width: '100%' }} addonAfter="л" />
          </Form.Item>
          <Form.Item
            label="Інтервал заміни оливи"
            name="oil_change_interval_km"
          >
            <InputNumber min={1000} step={1000} style={{ width: '100%' }} addonAfter="км" placeholder="20000" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={oilSaving} block>
            {kit ? 'Зберегти' : 'Створити комплект'}
          </Button>
        </Form>
      </Modal>

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

      {/* Модалка фільтра */}
      <Modal
        title="Додати фільтр"
        open={isFilterModalOpen}
        onCancel={() => { setIsFilterModalOpen(false); formFilter.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form form={formFilter} layout="vertical" onFinish={handleAddFilter}>
          <Form.Item
            label="Запчастина"
            name="part"
            rules={[{ required: true, message: 'Оберіть запчастину' }]}
          >
            <Select
              showSearch
              placeholder="Оберіть фільтр зі складу"
              loading={productsLoading}
              optionFilterProp="label"
              options={filterProducts.map(p => ({ value: p.id, label: `${p.sku_code ? p.sku_code + ' — ' : ''}${p.name}` }))}
            />
          </Form.Item>
          <Form.Item
            label="Кількість"
            name="quantity"
            initialValue={1}
            rules={[{ required: true, message: 'Вкажіть кількість' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Інтервал заміни фільтра"
            name="change_interval_km"
          >
            <InputNumber min={1000} step={1000} style={{ width: '100%' }} addonAfter="км" placeholder="20000" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={filterSaving} block>
            Додати
          </Button>
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
            value={`https://ital-truck.com.ua/trucks/${truck?.id}`}
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
import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Table, Tag, message, Tabs, Modal, Form, Select, InputNumber, Space, Typography, Spin, Empty } from 'antd';
import { EditOutlined, FileTextOutlined, ToolOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { trucksAPI, ordersAPI, baseModelsAPI, clientsAPI, maintenanceAPI, inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatDate } from '../../utils/formatters';
import { EURO_STANDARDS } from '../../utils/constants';

const { Text } = Typography;

function TruckDetailPage() {
  const [truck, setTruck] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [baseModelName, setBaseModelName] = useState(null);
  const [clientName, setClientName] = useState(null);

  const [kit, setKit] = useState(null);
  const [kitLoading, setKitLoading] = useState(false);
  const [oilProducts, setOilProducts] = useState([]);
  const [filterProducts, setFilterProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [isOilModalOpen, setIsOilModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [oilSaving, setOilSaving] = useState(false);
  const [filterSaving, setFilterSaving] = useState(false);

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsLoaded, setLogsLoaded] = useState(false);

  const [formOil] = Form.useForm();
  const [formFilter] = Form.useForm();

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

  const handleTabChange = (key) => {
    if (key === 'history') loadLogs();
  };

  const loadOilProducts = async () => {
    if (oilProducts.length > 0) return;
    setProductsLoading(true);
    try {
      const res = await inventoryAPI.getAll({ page_size: 500, subcategory__category__category_type: 'oil' });
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
      const res = await inventoryAPI.getAll({ page_size: 500, subcategory__category__category_type: 'filter' });
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
  ];

  return (
    <div>
      <PageHeader
        title={truck.license_plate}
        subtitle={truck.specific_model_name}
        showBack
        extra={
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/trucks/${id}/edit`)}
          >
            Редагувати
          </Button>
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
                {EURO_STANDARDS[truck.euro_standard]?.label || truck.euro_standard}
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
    </div>
  );
}

export default TruckDetailPage;
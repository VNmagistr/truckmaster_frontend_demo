import React, { useState, useEffect, useMemo } from 'react';
import { Form, Input, Button, Card, message, Space, Select, Upload, Alert, Row, Col, Typography, Spin, Divider } from 'antd';
import { SaveOutlined, ExclamationCircleOutlined, SearchOutlined, CarOutlined, UserOutlined, CameraOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { ordersAPI, clientsAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import debounce from 'lodash/debounce';

const { Text } = Typography;

function OrderFormPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [clients, setClients] = useState([]);
  const [truckOptions, setTruckOptions] = useState([]); 
  const [searchingTrucks, setSearchingTrucks] = useState(false);
  
  // Стан для відображення вибраного авто та власника
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [clientLocked, setClientLocked] = useState(false);
  const [fetchingClient, setFetchingClient] = useState(false);
  
  const [alerts, setAlerts] = useState([]);
  
  // Окремі стани для кожного фото
  const [carPhotoList, setCarPhotoList] = useState([]);
  const [odometerPhotoList, setOdometerPhotoList] = useState([]);
  const [dashboardPhotoList, setDashboardPhotoList] = useState([]);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // 1. Завантажуємо клієнтів
        const clientsResp = await clientsAPI.getAll({ page_size: 500 }).catch(() => []);
        const clientsData = clientsResp.data || clientsResp;
        // Зберігаємо всіх завантажених клієнтів
        const initialClients = clientsData.results || clientsData || [];
        setClients(initialClients);

        // 2. Якщо редагування - завантажуємо замовлення
        if (isEdit) {
          const orderResp = await ordersAPI.getById(id);
          const orderData = orderResp.data || orderResp;

          if (orderData) {
            // Перевіряємо, чи є власник у списку клієнтів. Якщо ні — додаємо його вручну.
            if (orderData.client) {
                const clientId = typeof orderData.client === 'object' ? orderData.client.id : orderData.client;
                const clientName = typeof orderData.client === 'object' ? orderData.client.name : null;
                
                // Якщо маємо ім'я, але клієнта немає в списку — додаємо
                const exists = initialClients.find(c => c.id === clientId);
                if (!exists && clientName) {
                    setClients(prev => [...prev, { id: clientId, name: clientName }]);
                } else if (!exists && !clientName) {
                    // Якщо імені немає, пробуємо довантажити (рідкісний кейс при редагуванні)
                    try {
                        const cRes = await clientsAPI.getById(clientId);
                        const cData = cRes.data || cRes;
                        setClients(prev => [...prev, cData]);
                    } catch (e) {
                        console.error("Failed to fetch client details");
                    }
                }
            }

            if (orderData.truck) {
              const truckObj = orderData.truck;
              // Формуємо об'єкт для відображення в селекті
              const initialTruck = {
                id: truckObj.id,
                license_plate: truckObj.license_plate,
                specific_model_name: truckObj.specific_model_name || truckObj.model,
                vin: truckObj.vin || truckObj.last_seven_vin,
                // Важливо зберегти дані клієнта тут
                client_id: typeof orderData.client === 'object' ? orderData.client.id : orderData.client
              };
              setTruckOptions([initialTruck]);
              setSelectedTruck(initialTruck);
              setClientLocked(true);
            }

            // Встановлюємо значення форми
            form.setFieldsValue({
              ...orderData,
              client: typeof orderData.client === 'object' ? orderData.client.id : orderData.client,
              truck: typeof orderData.truck === 'object' ? orderData.truck.id : orderData.truck,
              current_mileage: orderData.current_mileage
            });
            
            // Заповнення фото
            if (orderData.car_photo) setCarPhotoList([{ uid: '-1', name: 'car_photo.jpg', status: 'done', url: orderData.car_photo }]);
            if (orderData.odometer_photo) setOdometerPhotoList([{ uid: '-2', name: 'odometer.jpg', status: 'done', url: orderData.odometer_photo }]);
            if (orderData.dashboard_photo) setDashboardPhotoList([{ uid: '-3', name: 'dashboard.jpg', status: 'done', url: orderData.dashboard_photo }]);

            if (orderData.truck && orderData.current_mileage) {
              const tId = typeof orderData.truck === 'object' ? orderData.truck.id : orderData.truck;
              checkMaintenance(tId, orderData.current_mileage);
            }
          }
        }
      } catch (error) {
        console.error('Init error:', error);
        message.error('Помилка завантаження даних');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [id, isEdit, form]);

  const handleSearchTruck = async (value) => {
    if (!value || value.length < 2) {
      setTruckOptions([]);
      return;
    }
    setSearchingTrucks(true);
    try {
      const res = await ordersAPI.searchTruck(value);
      const data = res.data || res;
      setTruckOptions(data.results || data || []);
    } catch (error) {
      console.error("Error searching trucks:", error);
    } finally {
      setSearchingTrucks(false);
    }
  };

  const debouncedSearch = useMemo(() => debounce(handleSearchTruck, 600), []);

  const handleTruckSelect = async (truckId, option) => {
    const truckData = option.truck;
    if (!truckData) return;

    setSelectedTruck(truckData);
    setAlerts([]);

    // Логіка визначення ID клієнта
    let clientId = null;
    let clientName = null;

    if (truckData.client && typeof truckData.client === 'object') {
        clientId = truckData.client.id;
        clientName = truckData.client.name;
    } else if (truckData.client_id) {
        clientId = truckData.client_id;
        clientName = truckData.client_name; // API може повертати client_name
    } else if (truckData.client) {
        clientId = truckData.client;
    }

    if (clientId) {
        // Перевіряємо, чи є цей клієнт у списку
        const clientExists = clients.find(c => c.id === clientId);

        if (clientExists) {
            // Клієнт є - просто вибираємо
            form.setFieldsValue({ client: clientId });
            setClientLocked(true);
        } else {
            // Клієнта немає - треба додати
            if (clientName) {
                // Якщо знаємо ім'я - додаємо одразу
                const newClient = { id: clientId, name: clientName };
                setClients(prev => [...prev, newClient]);
                form.setFieldsValue({ client: clientId });
                setClientLocked(true);
            } else {
                // Якщо імені не знаємо - робимо запит
                setFetchingClient(true);
                try {
                    const res = await clientsAPI.getById(clientId);
                    const fetchedClient = res.data || res;
                    
                    setClients(prev => [...prev, fetchedClient]);
                    form.setFieldsValue({ client: clientId });
                    setClientLocked(true);
                } catch (error) {
                    console.error("Не вдалося завантажити клієнта", error);
                    message.warning("Не вдалося завантажити ім'я власника");
                    // Все одно ставимо ID, щоб форма не була пустою
                    form.setFieldsValue({ client: clientId });
                } finally {
                    setFetchingClient(false);
                }
            }
        }
    } else {
        // Авто без власника
        setClientLocked(false);
        form.setFieldsValue({ client: undefined });
    }

    // Перевірка пробігу
    const mileage = form.getFieldValue('current_mileage');
    if (mileage) {
        checkMaintenance(truckId, mileage);
    }
  };

  const handleTruckClear = () => {
    setSelectedTruck(null);
    setClientLocked(false);
    form.setFieldsValue({ client: undefined });
    setAlerts([]);
  };

  const checkMaintenance = async (truckId, mileage) => {
    if (!truckId || !mileage) return;
    try {
      if (ordersAPI.checkMaintenance) {
          const res = await ordersAPI.checkMaintenance(truckId, mileage);
          const data = res.data || res;
          if (data && data.alerts) setAlerts(data.alerts);
      }
    } catch (error) {
      console.error("Error checking maintenance:", error);
    }
  };

  const handleMileageChange = (e) => {
    const mileage = e.target.value;
    const truckId = form.getFieldValue('truck');
    if (truckId && mileage) {
      const timer = setTimeout(() => checkMaintenance(truckId, mileage), 800);
      return () => clearTimeout(timer);
    }
  };

  const onFinish = async (values) => {
    setSaving(true);
    try {
      const formData = new FormData();
      Object.keys(values).forEach(key => {
        if (values[key] !== undefined && values[key] !== null) {
          formData.append(key, values[key]);
        }
      });

      if (carPhotoList[0]?.originFileObj) formData.append('car_photo', carPhotoList[0].originFileObj);
      if (odometerPhotoList[0]?.originFileObj) formData.append('odometer_photo', odometerPhotoList[0].originFileObj);
      if (dashboardPhotoList[0]?.originFileObj) formData.append('dashboard_photo', dashboardPhotoList[0].originFileObj);

      if (isEdit) {
        await ordersAPI.update(id, formData);
        message.success('Замовлення оновлено!');
      } else {
        await ordersAPI.create(formData);
        message.success('Замовлення створено!');
      }
      navigate('/orders');
    } catch (error) {
      console.error('Save error:', error);
      message.error('Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  const uploadProps = {
    beforeUpload: () => false,
    maxCount: 1,
    listType: "picture-card",
    showUploadList: { showPreviewIcon: true, showRemoveIcon: true }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={isEdit ? `Замовлення #${id}` : 'Нове замовлення'} showBack />
      
      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card>
            <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ status: 'OPEN' }}>
              
              <Form.Item
                name="truck"
                label={<Space><CarOutlined /><span>Автомобіль (введіть номер)</span></Space>}
                rules={[{ required: true, message: 'Оберіть автомобіль' }]}
              >
                <Select
                  showSearch
                  placeholder="Введіть номер авто (напр. АА1234ВВ)..."
                  filterOption={false}
                  onSearch={debouncedSearch}
                  onSelect={handleTruckSelect}
                  onClear={handleTruckClear}
                  notFoundContent={searchingTrucks ? <Spin size="small" /> : null}
                  allowClear
                  suffixIcon={<SearchOutlined />}
                  size="large"
                >
                  {truckOptions.map(truck => (
                    <Select.Option key={truck.id} value={truck.id} truck={truck}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span><strong>{truck.license_plate}</strong> {truck.specific_model_name}</span>
                        <small style={{ color: '#999' }}>{truck.client_name}</small>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedTruck && (
                <Card size="small" style={{ marginBottom: 16, background: '#f6ffed', borderColor: '#b7eb8f' }}>
                  <Row gutter={16}>
                    <Col span={8}><Text type="secondary">Номер:</Text><br/><Text strong>{selectedTruck.license_plate}</Text></Col>
                    <Col span={8}><Text type="secondary">Модель:</Text><br/><Text>{selectedTruck.specific_model_name || '-'}</Text></Col>
                    <Col span={8}><Text type="secondary">VIN:</Text><br/><Text>{selectedTruck.vin || '-'}</Text></Col>
                  </Row>
                </Card>
              )}

              <Form.Item 
                name="client" 
                label={<Space><UserOutlined /><span>Власник</span>{fetchingClient && <Spin size="small" />}</Space>}
                rules={[{ required: true, message: 'Оберіть власника' }]}
              >
                <Select 
                  showSearch 
                  placeholder={clientLocked ? "Власник визначено автоматично" : "Оберіть власника"}
                  optionFilterProp="children"
                  disabled={clientLocked || fetchingClient}
                  size="large"
                  loading={fetchingClient}
                >
                  {clients.map(c => (
                    <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {clientLocked && !fetchingClient && (
                <Button type="link" size="small" onClick={() => setClientLocked(false)} style={{ marginTop: -10, paddingLeft: 0 }}>
                  Змінити власника вручну
                </Button>
              )}

              <Divider />

              <Form.Item name="current_mileage" label="Поточний пробіг" rules={[{ required: true, message: 'Вкажіть пробіг' }]}>
                <Input type="number" onChange={handleMileageChange} suffix="км" size="large" />
              </Form.Item>

              {alerts.map((alert, idx) => (
                <Alert key={idx} message={alert.message} type={alert.message?.includes('Прострочено') ? 'error' : 'warning'} showIcon style={{ marginBottom: 8 }} />
              ))}

              <Divider orientation="left">Фотофіксація</Divider>
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item label="Фото авто/номера">
                    <Upload {...uploadProps} fileList={carPhotoList} onChange={({ fileList }) => setCarPhotoList(fileList)}>
                      {carPhotoList.length < 1 && <div><CameraOutlined /><div style={{ marginTop: 8 }}>Номер</div></div>}
                    </Upload>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label="Фото одометра">
                    <Upload {...uploadProps} fileList={odometerPhotoList} onChange={({ fileList }) => setOdometerPhotoList(fileList)}>
                      {odometerPhotoList.length < 1 && <div><CameraOutlined /><div style={{ marginTop: 8 }}>Пробіг</div></div>}
                    </Upload>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label="Фото панелі приладів">
                    <Upload {...uploadProps} fileList={dashboardPhotoList} onChange={({ fileList }) => setDashboardPhotoList(fileList)}>
                      {dashboardPhotoList.length < 1 && <div><CameraOutlined /><div style={{ marginTop: 8 }}>Панель</div></div>}
                    </Upload>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="problem_description" label="Опис проблеми">
                <Input.TextArea rows={4} />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />} size="large">
                    {isEdit ? 'Зберегти' : 'Створити'}
                  </Button>
                  <Button onClick={() => navigate('/orders')} size="large">Скасувати</Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
            <Card title="Підказки" size="small">
                <p>Введіть мінімум 2 символи для пошуку авто.</p>
                <p>Власник підтягнеться автоматично.</p>
                <p>Не забудьте додати всі 3 фото.</p>
            </Card>
        </Col>
      </Row>
    </div>
  );
}

export default OrderFormPage;
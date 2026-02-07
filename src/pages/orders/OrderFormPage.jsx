import React, { useState, useEffect, useMemo } from 'react';
import { Form, Input, Button, Card, message, Space, Select, Upload, Alert, Row, Col, Typography, Spin, Divider } from 'antd';
import { SaveOutlined, UploadOutlined, ExclamationCircleOutlined, SearchOutlined, CarOutlined, UserOutlined, CameraOutlined } from '@ant-design/icons';
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
        setClients(clientsData.results || clientsData || []);

        // 2. Якщо редагування - завантажуємо замовлення
        if (isEdit) {
          const orderResp = await ordersAPI.getById(id);
          const orderData = orderResp.data || orderResp;

          if (orderData) {
            if (orderData.truck) {
              const initialTruck = {
                id: orderData.truck.id,
                license_plate: orderData.truck.license_plate,
                specific_model_name: orderData.truck.specific_model_name || orderData.truck.model,
                client_id: orderData.client?.id,
                client_name: orderData.client?.name
              };
              setTruckOptions([initialTruck]);
              setSelectedTruck(initialTruck);
              setClientLocked(true);
            }

            form.setFieldsValue({
              ...orderData,
              client: orderData.client?.id || orderData.client,
              truck: orderData.truck?.id || orderData.truck,
              current_mileage: orderData.current_mileage
            });
            
            // Якщо є фото, показуємо, що вони завантажені (опціонально можна додати прев'ю)
            if (orderData.car_photo) setCarPhotoList([{ uid: '-1', name: 'car_photo.jpg', status: 'done', url: orderData.car_photo }]);
            if (orderData.odometer_photo) setOdometerPhotoList([{ uid: '-2', name: 'odometer.jpg', status: 'done', url: orderData.odometer_photo }]);
            if (orderData.dashboard_photo) setDashboardPhotoList([{ uid: '-3', name: 'dashboard.jpg', status: 'done', url: orderData.dashboard_photo }]);

            if (orderData.truck && orderData.current_mileage) {
              checkMaintenance(orderData.truck.id || orderData.truck, orderData.current_mileage);
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

  // Пошук авто по номеру
  const handleSearchTruck = async (value) => {
    if (!value || value.length < 2) {
      setTruckOptions([]);
      return;
    }
    
    setSearchingTrucks(true);
    try {
      const res = await ordersAPI.searchTruck(value);
      const data = res.data || res;
      const results = data.results || data || [];
      setTruckOptions(results);
    } catch (error) {
      console.error("Помилка пошуку авто:", error);
      message.error('Помилка пошуку авто');
    } finally {
      setSearchingTrucks(false);
    }
  };

  // Debounce для пошуку (600мс затримка)
  const debouncedSearch = useMemo(() => debounce(handleSearchTruck, 600), []);

  // Обробка вибору авто
  const handleTruckSelect = (truckId, option) => {
    const truckData = option.truck;
    
    if (truckData) {
      setSelectedTruck(truckData);
      
      // 🔥 ВИПРАВЛЕНА ЛОГІКА ВИЗНАЧЕННЯ ВЛАСНИКА
      let clientId = null;
      
      // 1. Перевіряємо чи прийшов об'єкт client
      if (truckData.client && typeof truckData.client === 'object') {
          clientId = truckData.client.id;
      } 
      // 2. Перевіряємо чи прийшов client_id (якщо серіалізатор плоский)
      else if (truckData.client_id) {
          clientId = truckData.client_id;
      }
      // 3. Перевіряємо чи прийшов client як ID
      else if (truckData.client) {
          clientId = truckData.client;
      }

      if (clientId) {
        form.setFieldsValue({ client: clientId });
        setClientLocked(true);
      } else {
        // Якщо авто без власника - дозволяємо вибрати вручну
        setClientLocked(false);
        form.setFieldsValue({ client: undefined });
      }
    }
    
    // Очищаємо попередні alerts
    setAlerts([]);
    
    // Перевіряємо регламенти якщо є пробіг
    const mileage = form.getFieldValue('current_mileage');
    if (mileage) {
      checkMaintenance(truckId, mileage);
    }
  };

  // Очищення вибору авто
  const handleTruckClear = () => {
    setSelectedTruck(null);
    setClientLocked(false);
    form.setFieldsValue({ client: undefined });
    setAlerts([]);
  };

  // Перевірка регламентів ТО
  const checkMaintenance = async (truckId, mileage) => {
    if (!truckId || !mileage) return;
    
    try {
      if (!ordersAPI.checkMaintenance) return;
      
      const res = await ordersAPI.checkMaintenance(truckId, mileage);
      const data = res.data || res;
      
      if (data && data.alerts) {
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error("Помилка перевірки регламентів:", error);
    }
  };

  // Обробка зміни пробігу
  const handleMileageChange = (e) => {
    const mileage = e.target.value;
    const truckId = form.getFieldValue('truck');
    
    if (truckId && mileage) {
      // Debounce перевірки регламентів
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

      // 🔥 ДОДАВАННЯ ФОТО В FORMDATA
      // Перевіряємо, чи це новий файл (має originFileObj)
      if (carPhotoList.length > 0 && carPhotoList[0].originFileObj) {
        formData.append('car_photo', carPhotoList[0].originFileObj);
      }
      
      if (odometerPhotoList.length > 0 && odometerPhotoList[0].originFileObj) {
        formData.append('odometer_photo', odometerPhotoList[0].originFileObj);
      }
      
      if (dashboardPhotoList.length > 0 && dashboardPhotoList[0].originFileObj) {
        formData.append('dashboard_photo', dashboardPhotoList[0].originFileObj);
      }

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

  // Загальні пропси для компонентів Upload
  const uploadProps = {
    beforeUpload: () => false, // Забороняємо автоматичне завантаження
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
              
              {/* Пошук автомобіля */}
              <Form.Item
                name="truck"
                label={
                  <Space>
                    <CarOutlined />
                    <span>Автомобіль (введіть номер)</span>
                  </Space>
                }
                rules={[{ required: true, message: 'Оберіть автомобіль' }]}
              >
                <Select
                  showSearch
                  placeholder="Введіть номер авто (напр. АА1234ВВ)..."
                  filterOption={false}
                  onSearch={debouncedSearch}
                  onSelect={handleTruckSelect}
                  onClear={handleTruckClear}
                  notFoundContent={
                    searchingTrucks ? (
                      <Spin size="small" />
                    ) : truckOptions.length === 0 ? (
                      <Text type="secondary">Введіть мінімум 2 символи для пошуку</Text>
                    ) : null
                  }
                  allowClear
                  suffixIcon={<SearchOutlined />}
                  size="large"
                >
                  {truckOptions.map(truck => (
                    <Select.Option key={truck.id} value={truck.id} truck={truck}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong>{truck.license_plate}</Text>
                          <Text type="secondary" style={{ marginLeft: 8 }}>
                            {truck.specific_model_name || truck.model || ''}
                          </Text>
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            <UserOutlined style={{ marginRight: 4 }} />
                            {truck.client_name || 'Без власника'}
                          </Text>
                        </div>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Інформація про вибране авто */}
              {selectedTruck && (
                <Card 
                  size="small" 
                  style={{ marginBottom: 16, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}
                >
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text type="secondary">Номер:</Text>
                      <br />
                      <Text strong>{selectedTruck.license_plate}</Text>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Модель:</Text>
                      <br />
                      <Text>{selectedTruck.specific_model_name || selectedTruck.model || '-'}</Text>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">VIN (останні 7):</Text>
                      <br />
                      <Text>{selectedTruck.vin || selectedTruck.last_seven_vin || '-'}</Text>
                    </Col>
                  </Row>
                </Card>
              )}

              {/* Власник (клієнт) */}
              <Form.Item 
                name="client" 
                label={
                  <Space>
                    <UserOutlined />
                    <span>Власник</span>
                    {clientLocked && <Text type="secondary">(автоматично)</Text>}
                  </Space>
                }
                rules={[{ required: true, message: 'Оберіть власника' }]}
              >
                <Select 
                  showSearch 
                  placeholder={clientLocked ? "Власник визначено автоматично" : "Оберіть власника"}
                  optionFilterProp="children"
                  disabled={clientLocked}
                  size="large"
                >
                  {clients.map(c => (
                    <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Кнопка для зміни власника вручну */}
              {clientLocked && (
                <div style={{ marginTop: -12, marginBottom: 16 }}>
                  <Button 
                    type="link" 
                    size="small" 
                    onClick={() => setClientLocked(false)}
                  >
                    Змінити власника вручну
                  </Button>
                </div>
              )}

              <Divider />

              {/* Пробіг */}
              <Form.Item 
                name="current_mileage" 
                label="Поточний пробіг" 
                rules={[{ required: true, message: 'Вкажіть пробіг' }]}
              >
                <Input 
                  type="number" 
                  onChange={handleMileageChange} 
                  suffix="км" 
                  size="large"
                  placeholder="Наприклад: 450000"
                />
              </Form.Item>

              {/* Алерти про регламенти */}
              {alerts.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  {alerts.map((alert, idx) => (
                    <Alert 
                      key={idx} 
                      message={alert.message} 
                      type={alert.message?.includes('Прострочено') ? 'error' : 'warning'}
                      showIcon 
                      icon={<ExclamationCircleOutlined />} 
                      style={{ marginBottom: 8 }} 
                    />
                  ))}
                </div>
              )}

              <Divider orientation="left">Фотофіксація</Divider>

              <Row gutter={16}>
                {/* 1. Фото авто/номера */}
                <Col xs={24} sm={8}>
                  <Form.Item label="Фото авто/номера">
                    <Upload 
                      {...uploadProps}
                      fileList={carPhotoList} 
                      onChange={({ fileList }) => setCarPhotoList(fileList)}
                    >
                      {carPhotoList.length < 1 && (
                        <div>
                          <CameraOutlined />
                          <div style={{ marginTop: 8 }}>Номер</div>
                        </div>
                      )}
                    </Upload>
                  </Form.Item>
                </Col>

                {/* 2. Фото одометра */}
                <Col xs={24} sm={8}>
                  <Form.Item label="Фото одометра">
                    <Upload 
                      {...uploadProps}
                      fileList={odometerPhotoList} 
                      onChange={({ fileList }) => setOdometerPhotoList(fileList)}
                    >
                      {odometerPhotoList.length < 1 && (
                        <div>
                          <CameraOutlined />
                          <div style={{ marginTop: 8 }}>Пробіг</div>
                        </div>
                      )}
                    </Upload>
                  </Form.Item>
                </Col>

                {/* 3. Фото панелі приладів */}
                <Col xs={24} sm={8}>
                  <Form.Item label="Фото панелі приладів">
                    <Upload 
                      {...uploadProps}
                      fileList={dashboardPhotoList} 
                      onChange={({ fileList }) => setDashboardPhotoList(fileList)}
                    >
                      {dashboardPhotoList.length < 1 && (
                        <div>
                          <CameraOutlined />
                          <div style={{ marginTop: 8 }}>Панель</div>
                        </div>
                      )}
                    </Upload>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="problem_description" label="Опис проблеми / скарги клієнта">
                <Input.TextArea 
                  rows={4} 
                  placeholder="Опишіть проблему або скарги клієнта..."
                />
              </Form.Item>

              <Form.Item>
                <Space size="middle">
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={saving} 
                    icon={<SaveOutlined />}
                    size="large"
                  >
                    {isEdit ? 'Зберегти зміни' : 'Створити замовлення'}
                  </Button>
                  <Button onClick={() => navigate('/orders')} size="large">
                    Скасувати
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Бічна панель з підказками */}
        <Col xs={24} lg={8}>
          <Card title="Підказки" size="small">
            <ol style={{ paddingLeft: 16, margin: 0 }}>
              <li style={{ marginBottom: 8 }}>
                <Text>Введіть номер авто (мінімум 2 символи)</Text>
              </li>
              <li style={{ marginBottom: 8 }}>
                <Text>Оберіть авто зі списку — власник підставиться автоматично</Text>
              </li>
              <li style={{ marginBottom: 8 }}>
                <Text>Вкажіть поточний пробіг для перевірки регламентів ТО</Text>
              </li>
              <li>
                <Text>Обов'язково додайте 3 фотографії для фіксації стану авто</Text>
              </li>
            </ol>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default OrderFormPage;
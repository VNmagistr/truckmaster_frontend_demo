import React, { useState, useEffect, useMemo } from 'react';
import { Form, Input, Button, Card, message, Space, Select, Upload, Alert, Row, Col, Typography, Spin, Divider } from 'antd';
import { SaveOutlined, UploadOutlined, ExclamationCircleOutlined, SearchOutlined, CarOutlined, UserOutlined } from '@ant-design/icons';
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
  const [fileList, setFileList] = useState([]);
  
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
      
      // Автоматично підставляємо власника
      if (truckData.client_id) {
        form.setFieldsValue({ client: truckData.client_id });
        setClientLocked(true);
      } else {
        // Якщо авто без власника - дозволяємо вибрати вручну
        setClientLocked(false);
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

  const handleFileChange = ({ fileList: newFileList }) => setFileList(newFileList);

  const onFinish = async (values) => {
    setSaving(true);
    try {
      const formData = new FormData();
      
      Object.keys(values).forEach(key => {
        if (values[key] !== undefined && values[key] !== null) {
          formData.append(key, values[key]);
        }
      });

      fileList.forEach((file, index) => {
        if (file.originFileObj) {
          if (index === 0) formData.append('car_photo', file.originFileObj);
          else if (index === 1) formData.append('odometer_photo', file.originFileObj);
          else if (index === 2) formData.append('dashboard_photo', file.originFileObj);
        }
      });

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

              <Divider />

              {/* Фото */}
              <Form.Item label="Фотофіксація (авто, одометр, панель)">
                <Upload 
                  listType="picture-card" 
                  fileList={fileList} 
                  onChange={handleFileChange} 
                  beforeUpload={() => false} 
                  maxCount={3}
                >
                  {fileList.length < 3 && (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>Фото</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>

              {/* Опис проблеми */}
              <Form.Item name="problem_description" label="Опис проблеми / скарги клієнта">
                <Input.TextArea 
                  rows={4} 
                  placeholder="Опишіть проблему або скарги клієнта..."
                />
              </Form.Item>

              {/* Кнопки */}
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
                <Text>Додайте фото авто та одометра</Text>
              </li>
            </ol>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default OrderFormPage;
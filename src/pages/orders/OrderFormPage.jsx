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
        const clientsResp = await clientsAPI.getAll({ page_size: 500 }).catch(() => ({ data: [] }));
        const clientsData = clientsResp.data || clientsResp;
        const clientsList = clientsData.results || clientsData || [];
        setClients(clientsList);

        // 2. Якщо редагування - завантажуємо замовлення
        if (isEdit) {
          const orderResp = await ordersAPI.getById(id);
          const orderData = orderResp.data || orderResp;

          if (orderData) {
            // Зберігаємо дані про авто
            if (orderData.truck) {
              const initialTruck = {
                id: orderData.truck.id,
                license_plate: orderData.truck.license_plate,
                specific_model_name: orderData.truck.specific_model_name || orderData.truck.model,
                vin: orderData.truck.last_seven_vin,
                client_id: orderData.client?.id,
                client_name: orderData.client?.name
              };
              setTruckOptions([initialTruck]);
              setSelectedTruck(initialTruck);
              setClientLocked(true);
            }

            // Встановлюємо значення форми
            form.setFieldsValue({
              truck: orderData.truck?.id || orderData.truck,
              client: orderData.client?.id || orderData.client,
              current_mileage: orderData.current_mileage,
              problem_description: orderData.problem_description,
              status: orderData.status
            });
            
            // Перевіряємо регламенти
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

  // Отримуємо ім'я клієнта для відображення
  const getClientName = () => {
    const clientId = form.getFieldValue('client');
    
    // Спочатку шукаємо в selectedTruck
    if (selectedTruck?.client_name) {
      return selectedTruck.client_name;
    }
    
    // Потім шукаємо в списку клієнтів
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        return client.name;
      }
    }
    
    return '';
  };

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

  // Очистка debounce при розмонтуванні
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

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
        form.setFieldsValue({ client: undefined });
        setClientLocked(false);
        message.warning('У цього авто немає власника. Оберіть клієнта вручну.');
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
    setTruckOptions([]);
  };

  // Розблокування поля клієнта
  const handleUnlockClient = () => {
    setClientLocked(false);
  };

  // Перевірка регламентів ТО
  const checkMaintenance = async (truckId, mileage) => {
    if (!truckId || !mileage) return;
    
    try {
      if (!ordersAPI.checkMaintenance) return;
      
      const res = await ordersAPI.checkMaintenance(truckId, mileage);
      const data = res.data || res;
      
      if (data && data.alerts && data.alerts.length > 0) {
        setAlerts(data.alerts);
      } else {
        setAlerts([]);
      }
    } catch (error) {
      console.error("Помилка перевірки регламентів:", error);
    }
  };

  // Обробка зміни пробігу
  const handleMileageBlur = (e) => {
    const mileage = e.target.value;
    const truckId = form.getFieldValue('truck');
    
    if (truckId && mileage) {
      checkMaintenance(truckId, mileage);
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
      const errorMsg = error.response?.data?.detail || 
                       error.response?.data?.client?.[0] ||
                       'Помилка збереження';
      message.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  // Отримуємо ім'я клієнта для відображення
  const clientName = getClientName();

  return (
    <div>
      <PageHeader title={isEdit ? `Редагування замовлення #${id}` : 'Нове замовлення'} showBack />
      
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
                    <span>Автомобіль</span>
                  </Space>
                }
                rules={[{ required: true, message: 'Оберіть автомобіль' }]}
                extra="Введіть мінімум 2 символи номерного знаку для пошуку"
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
                      <div style={{ textAlign: 'center', padding: '10px' }}>
                        <Spin size="small" />
                        <div>Пошук...</div>
                      </div>
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
                          <Text strong style={{ fontSize: '15px' }}>{truck.license_plate}</Text>
                          <Text type="secondary" style={{ marginLeft: 10 }}>
                            {truck.specific_model_name || truck.model || ''}
                          </Text>
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: '13px' }}>
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
                      <Text strong style={{ fontSize: '16px' }}>{selectedTruck.license_plate}</Text>
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
                    {clientLocked && <Text type="success">(визначено автоматично)</Text>}
                  </Space>
                }
                rules={[{ required: true, message: 'Оберіть власника' }]}
              >
                {clientLocked ? (
                  // Коли заблоковано - показуємо Select але з відображенням імені
                  <Select
                    disabled
                    size="large"
                    placeholder="Власник визначено автоматично"
                  >
                    {clients.map(c => (
                      <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                    ))}
                  </Select>
                ) : (
                  // Коли розблоковано - звичайний Select
                  <Select 
                    showSearch 
                    placeholder="Оберіть власника"
                    optionFilterProp="children"
                    size="large"
                    filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {clients.map(c => (
                      <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                    ))}
                  </Select>
                )}
              </Form.Item>

              {/* Показуємо ім'я клієнта окремо, якщо заблоковано */}
              {clientLocked && clientName && (
                <div style={{ marginTop: -12, marginBottom: 8 }}>
                  <Text strong style={{ color: '#52c41a' }}>
                    <UserOutlined style={{ marginRight: 6 }} />
                    {clientName}
                  </Text>
                </div>
              )}

              {/* Кнопка для зміни власника вручну */}
              {clientLocked && (
                <div style={{ marginBottom: 16 }}>
                  <Button 
                    type="link" 
                    size="small" 
                    onClick={handleUnlockClient}
                    style={{ padding: 0 }}
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
                  onBlur={handleMileageBlur} 
                  suffix="км" 
                  size="large"
                  placeholder="Наприклад: 450000"
                  min={0}
                />
              </Form.Item>

              {/* Алерти про регламенти */}
              {alerts.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  {alerts.map((alert, idx) => (
                    <Alert 
                      key={idx} 
                      message={alert.message || alert.rule_name} 
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
              <Form.Item label="Фотофіксація (авто, одометр, панель приладів)">
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
                      <div style={{ marginTop: 8 }}>Додати фото</div>
                    </div>
                  )}
                </Upload>
                <Text type="secondary">Максимум 3 фото: авто, одометр, панель приладів</Text>
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
          <Card title="Як створити замовлення" size="small">
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              <li style={{ marginBottom: 12 }}>
                <Text strong>Введіть номер авто</Text>
                <br />
                <Text type="secondary">Мінімум 2 символи для пошуку</Text>
              </li>
              <li style={{ marginBottom: 12 }}>
                <Text strong>Оберіть авто зі списку</Text>
                <br />
                <Text type="secondary">Власник підставиться автоматично</Text>
              </li>
              <li style={{ marginBottom: 12 }}>
                <Text strong>Вкажіть пробіг</Text>
                <br />
                <Text type="secondary">Система перевірить регламенти ТО</Text>
              </li>
              <li>
                <Text strong>Додайте фото та опис</Text>
                <br />
                <Text type="secondary">Фото авто, одометра, панелі</Text>
              </li>
            </ol>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default OrderFormPage;
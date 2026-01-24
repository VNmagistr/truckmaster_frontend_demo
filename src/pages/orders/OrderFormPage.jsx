import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, Card, message, Space, Select, Tooltip, Upload, Alert, Row, Col, Typography } from 'antd';
import { SaveOutlined, ReloadOutlined, UploadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { ordersAPI, clientsAPI, trucksAPI, maintenanceAPI } from '../../api'; // Перевір, що maintenanceAPI додано в api/index.js
import { PageHeader, LoadingSpinner } from '../../components';
import { ORDER_STATUSES } from '../../utils/constants';

const { Text } = Typography;

function OrderFormPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [clients, setClients] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [allTrucks, setAllTrucks] = useState([]);
  
  // Нові стани
  const [recommendations, setRecommendations] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [checkingRegulations, setCheckingRegulations] = useState(false);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  // --- БЕЗПЕЧНИЙ ПОШУК (Щоб не було білого екрану) ---
  const safeFilterOption = (input, option) => {
    if (!option) return false;
    let label = '';
    if (typeof option.children === 'string') label = option.children;
    else if (Array.isArray(option.children)) label = option.children.join('');
    else if (option.label) label = String(option.label);
    else label = String(option.children || '');
    return label.toLowerCase().includes(input.toLowerCase());
  };

  const getClientIdFromTruck = (truck) => {
    if (!truck || !truck.client) return null;
    return typeof truck.client === 'object' ? truck.client.id : truck.client;
  };

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const [clientsData, trucksData, orderData] = await Promise.all([
          clientsAPI.getAll({ page_size: 1000 }).catch(() => []),
          trucksAPI.getAll({ page_size: 1000 }).catch(() => []),
          isEdit ? ordersAPI.getById(id) : Promise.resolve(null)
        ]);

        const loadedClients = clientsData.results || clientsData || [];
        const loadedTrucks = trucksData.results || trucksData || [];
        
        setClients(loadedClients);
        setAllTrucks(loadedTrucks);

        if (orderData) {
          const initialValues = {
            ...orderData,
            client: orderData.client?.id || orderData.client,
            truck: orderData.truck?.id || orderData.truck,
            current_mileage: orderData.current_mileage // Переконайся, що бекенд віддає це поле
          };

          // Логіка фільтрації вантажівок при завантаженні
          const currentClientId = initialValues.client;
          if (currentClientId) {
             const filtered = loadedTrucks.filter(t => String(getClientIdFromTruck(t)) === String(currentClientId));
             // Якщо авто не знайдено в фільтрі, додаємо вручну
             const currentTruckId = initialValues.truck;
             if (currentTruckId && !filtered.find(t => t.id === currentTruckId)) {
                 const missing = loadedTrucks.find(t => t.id === currentTruckId);
                 if (missing) filtered.push(missing);
             }
             setTrucks(filtered);
          } else {
             setTrucks(loadedTrucks);
          }
          
          form.setFieldsValue(initialValues);
        } else {
          setTrucks([]); 
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

  const handleClientChange = (clientId) => {
    form.setFieldsValue({ truck: null }); 
    if (!clientId) {
      setTrucks([]);
      return;
    }
    const filtered = allTrucks.filter(truck => String(getClientIdFromTruck(truck)) === String(clientId));
    setTrucks(filtered);
  };

  const showAllTrucks = () => {
    setTrucks(allTrucks);
    message.info('Показано всі автомобілі');
  };

  // --- ПЕРЕВІРКА РЕГЛАМЕНТІВ ---
  const checkRegulations = useCallback(async (truckId, mileage) => {
    if (!truckId || !mileage) return;
    
    setCheckingRegulations(true);
    try {
        const res = await maintenanceAPI.checkRegulations(truckId, mileage);
        if (res.data && res.data.recommendations) {
            setRecommendations(res.data.recommendations);
            if (res.data.recommendations.length > 0) {
                message.warning(`Знайдено ${res.data.recommendations.length} рекомендацій по ТО!`);
            }
        }
    } catch (error) {
        console.error("Помилка перевірки регламенту:", error);
    } finally {
        setCheckingRegulations(false);
    }
  }, []);

  // Спрацьовує при зміні пробігу або авто
  const handleValuesChange = (changedValues, allValues) => {
    if (changedValues.truck || changedValues.current_mileage) {
        // Чекаємо поки введуть і пробіг, і виберуть авто
        if (allValues.truck && allValues.current_mileage) {
            // Робимо затримку (debounce), щоб не смикати API на кожну цифру
            const timer = setTimeout(() => {
                checkRegulations(allValues.truck, allValues.current_mileage);
            }, 800);
            return () => clearTimeout(timer);
        }
    }
  };

  // --- ЗАВАНТАЖЕННЯ ФОТО ---
  const handleFileChange = ({ fileList: newFileList }) => setFileList(newFileList);
  
  // --- ЗБЕРЕЖЕННЯ ---
  const onFinish = async (values) => {
    setSaving(true);
    try {
      // Використовуємо FormData для відправки файлів
      const formData = new FormData();
      
      // Додаємо звичайні поля
      Object.keys(values).forEach(key => {
        if (values[key] !== undefined && values[key] !== null) {
            formData.append(key, values[key]);
        }
      });

      // Додаємо фото (розподіляємо по типах або всі в car_photo, залежно від бекенду)
      // Тут логіка для 3-х окремих полів, як ми зробили в моделі
      fileList.forEach((file, index) => {
          if (file.originFileObj) {
              // Проста логіка: 1-ше фото -> car_photo, 2-ге -> odometer, 3-тє -> dashboard
              // Або можна зробити 3 окремі компоненти Upload. 
              // Для спрощення зараз: 1-ше фото в car_photo
              if (index === 0) formData.append('car_photo', file.originFileObj);
              if (index === 1) formData.append('odometer_photo', file.originFileObj);
              if (index === 2) formData.append('dashboard_photo', file.originFileObj);
          }
      });

      if (isEdit) {
        // При редагуванні FormData теж працює, але зазвичай PUT/PATCH
        await ordersAPI.update(id, formData); // Перевір чи API підтримує PATCH з FormData
        message.success('Оновлено!');
      } else {
        await ordersAPI.create(formData);
        message.success('Створено!');
      }
      navigate('/orders');
    } catch (error) {
      console.error('Save error:', error);
      message.error('Помилка збереження. Перевірте консоль.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title={isEdit ? `Замовлення #${id}` : 'Нове замовлення'}
        showBack
      />

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card>
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              onValuesChange={handleValuesChange}
              initialValues={{ status: 'OPEN' }}
            >
              <Form.Item
                name="client"
                label="Клієнт"
                rules={[{ required: true, message: 'Оберіть клієнта' }]}
              >
                <Select
                  showSearch
                  placeholder="Пошук клієнта..."
                  optionFilterProp="children"
                  filterOption={safeFilterOption}
                  onChange={handleClientChange}
                  allowClear
                >
                  {clients.map(c => (
                    <Select.Option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="Вантажівка" required style={{ marginBottom: 0 }}>
                 <Space.Compact style={{ width: '100%' }}>
                    <Form.Item name="truck" rules={[{ required: true, message: 'Оберіть авто' }]} noStyle>
                        <Select
                            showSearch
                            placeholder={trucks.length > 0 ? "Оберіть авто" : "Немає авто"}
                            optionFilterProp="children"
                            filterOption={safeFilterOption}
                            allowClear
                        >
                        {trucks.map(t => (
                            <Select.Option key={t.id} value={t.id}>
                            {t.license_plate} - {t.specific_model_name}
                            </Select.Option>
                        ))}
                        </Select>
                    </Form.Item>
                    <Tooltip title="Показати всі авто">
                        <Button icon={<ReloadOutlined />} onClick={showAllTrucks} />
                    </Tooltip>
                 </Space.Compact>
              </Form.Item>

              <Form.Item 
                name="current_mileage" 
                label="Поточний пробіг (км)" 
                style={{ marginTop: 24 }}
                rules={[{ required: true, message: 'Введіть пробіг' }]}
              >
                <Input type="number" placeholder="Наприклад: 250000" suffix="км" />
              </Form.Item>

              {/* Блок рекомендацій */}
              {recommendations.length > 0 && (
                  <Alert
                    message="Рекомендовані роботи (Регламент)"
                    type="warning"
                    showIcon
                    icon={<ExclamationCircleOutlined />}
                    style={{ marginBottom: 24 }}
                    description={
                        <ul style={{ paddingLeft: 20, marginTop: 10 }}>
                            {recommendations.map(rec => (
                                <li key={rec.id}>
                                    <strong>{rec.title}</strong> — {rec.description} 
                                    {rec.priority === 'high' && <Text type="danger" strong> (Терміново)</Text>}
                                </li>
                            ))}
                        </ul>
                    }
                  />
              )}

              <Form.Item label="Фотофіксація (Номер, Одометр, Панель)">
                <Upload
                    listType="picture-card"
                    fileList={fileList}
                    onChange={handleFileChange}
                    beforeUpload={() => false} // Не вантажимо автоматично, чекаємо Submit
                    maxCount={3}
                >
                    {fileList.length < 3 && (
                        <div>
                            <UploadOutlined />
                            <div style={{ marginTop: 8 }}>Додати фото</div>
                        </div>
                    )}
                </Upload>
                <div style={{ color: '#888', fontSize: '12px' }}>
                    Завантажте до 3-х фото (Номер, Одометр, Панель)
                </div>
              </Form.Item>

              <Form.Item name="problem_description" label="Опис проблеми">
                <Input.TextArea rows={4} placeholder="Скарги клієнта..." />
              </Form.Item>

              <Form.Item name="status" label="Статус" initialValue="OPEN" hidden>
                <Input />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                    {isEdit ? 'Зберегти зміни' : 'Створити замовлення'}
                  </Button>
                  <Button onClick={() => navigate('/orders')}>Скасувати</Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default OrderFormPage;
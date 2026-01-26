import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, Input, Button, Card, message, Space, Select, Upload, Alert, Row, Col, Typography, Spin } from 'antd';
import { SaveOutlined, UploadOutlined, ExclamationCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { ordersAPI, clientsAPI } from '../../api'; // trucksAPI та maintenanceAPI прибрали, все в ordersAPI
import { PageHeader, LoadingSpinner } from '../../components';
import debounce from 'lodash/debounce'; // npm install lodash якщо немає, або напиши свій debounce

const { Text } = Typography;

function OrderFormPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Стани даних
  const [clients, setClients] = useState([]);
  
  // Для пошуку авто
  const [truckOptions, setTruckOptions] = useState([]); 
  const [searchingTrucks, setSearchingTrucks] = useState(false);
  
  // Алерти та файли
  const [alerts, setAlerts] = useState([]);
  const [fileList, setFileList] = useState([]);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  // --- 1. ІНІЦІАЛІЗАЦІЯ ---
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // Вантажимо тільки клієнтів (для списку)
        const [clientsData, orderData] = await Promise.all([
          clientsAPI.getAll({ page_size: 1000 }).catch(() => []),
          isEdit ? ordersAPI.getById(id) : Promise.resolve(null)
        ]);

        setClients(clientsData.results || clientsData || []);

        if (orderData) {
          // Якщо це редагування - треба показати поточне авто в селекті
          if (orderData.truck) {
              const initialTruck = {
                  id: orderData.truck.id,
                  license_plate: orderData.truck.license_plate,
                  specific_model_name: orderData.truck.specific_model_name,
                  client_name: orderData.client?.name // Для красивого відображення
              };
              setTruckOptions([initialTruck]);
          }

          form.setFieldsValue({
            ...orderData,
            client: orderData.client?.id || orderData.client,
            truck: orderData.truck?.id || orderData.truck,
            current_mileage: orderData.current_mileage
          });
          
          // Якщо вже є дані, перевіряємо регламент
          if (orderData.truck && orderData.current_mileage) {
             checkMaintenance(orderData.truck.id || orderData.truck, orderData.current_mileage);
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

  // --- 2. ЖИВИЙ ПОШУК (Server-side) ---
  const handleSearchTruck = async (value) => {
      if (!value || value.length < 2) return; 
      
      setSearchingTrucks(true);
      try {
          const res = await ordersAPI.searchTruck(value);
          // Бекенд повертає { results: [...] }
          setTruckOptions(res.data.results || []);
      } catch (error) {
          console.error("Пошук авто:", error);
      } finally {
          setSearchingTrucks(false);
      }
  };

  // Debounce щоб не спамити сервер (затримка 600мс)
  const debouncedSearch = useMemo(() => debounce(handleSearchTruck, 600), []);

  // --- 3. ВИБІР АВТО ---
  const handleTruckSelect = (truckId, option) => {
      // option.item містить весь об'єкт, який ми передали в Select.Option
      const truckData = option.item;

      // АВТОЗАПОВНЕННЯ КЛІЄНТА
      if (truckData && truckData.client_id) {
          form.setFieldsValue({ client: truckData.client_id });
          message.success(`Клієнт ${truckData.client_name} підтягнувся автоматично`);
      } else {
          // Якщо клієнта немає у авто - очищаємо поле або залишаємо як є
          // message.info("У цього авто немає власника");
      }

      // Скидаємо старі алерти
      setAlerts([]);
      
      // Перевірка регламенту, якщо вже введено пробіг
      const mileage = form.getFieldValue('current_mileage');
      if (mileage) {
          checkMaintenance(truckId, mileage);
      }
  };

  // --- 4. ПЕРЕВІРКА РЕГЛАМЕНТУ ---
  const checkMaintenance = async (truckId, mileage) => {
      if (!truckId || !mileage) return;

      try {
          // Використовуємо новий метод з ordersAPI
          const res = await ordersAPI.checkMaintenance(truckId, mileage);
          
          // Бекенд повертає { alerts: [...] }
          if (res.data && res.data.alerts) {
              setAlerts(res.data.alerts);
          }
      } catch (error) {
          console.error("Reglament check failed", error);
      }
  };

  // Обробник зміни пробігу
  const handleMileageChange = (e) => {
      const mileage = e.target.value;
      const truckId = form.getFieldValue('truck');
      
      if (truckId && mileage) {
          // Також debounce, щоб не на кожну цифру
          const timer = setTimeout(() => checkMaintenance(truckId, mileage), 800);
          return () => clearTimeout(timer); // cleanup
      }
  };

  // --- 5. ЗБЕРЕЖЕННЯ ---
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

      // Фото
      fileList.forEach((file, index) => {
          if (file.originFileObj) {
              if (index === 0) formData.append('car_photo', file.originFileObj);
              if (index === 1) formData.append('odometer_photo', file.originFileObj);
              if (index === 2) formData.append('dashboard_photo', file.originFileObj);
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
              initialValues={{ status: 'OPEN' }}
            >
              {/* --- ПОЛЕ ПОШУКУ АВТО --- */}
              <Form.Item
                name="truck"
                label="Автомобіль (Введіть номер)"
                rules={[{ required: true, message: 'Оберіть авто' }]}
                help="Введіть хоча б 2 символи держномера для пошуку"
              >
                <Select
                    showSearch
                    placeholder="Введіть номер (напр. 1234)..."
                    filterOption={false} // ВИМИКАЄМО локальний фільтр, шукаємо на сервері
                    onSearch={debouncedSearch}
                    onSelect={handleTruckSelect}
                    notFoundContent={searchingTrucks ? <Spin size="small" /> : null}
                    allowClear
                    suffixIcon={<SearchOutlined />}
                >
                    {truckOptions.map(t => (
                        <Select.Option key={t.id} value={t.id} item={t}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>
                                    <strong>{t.license_plate}</strong> 
                                    <span style={{ color: '#888', marginLeft: 8 }}>
                                        {t.specific_model_name || t.model}
                                    </span>
                                </span>
                                <span style={{ color: '#1890ff', fontSize: '12px' }}>
                                    {t.client_name}
                                </span>
                            </div>
                        </Select.Option>
                    ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="client"
                label="Клієнт"
                rules={[{ required: true, message: 'Оберіть клієнта' }]}
              >
                <Select
                  showSearch
                  placeholder="Оберіть клієнта"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {clients.map(c => (
                    <Select.Option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item 
                name="current_mileage" 
                label="Поточний пробіг (км)" 
                style={{ marginTop: 24 }}
                rules={[{ required: true, message: 'Введіть пробіг' }]}
              >
                <Input 
                    type="number" 
                    placeholder="Наприклад: 250000" 
                    suffix="км" 
                    onChange={handleMileageChange} // Додали обробник
                />
              </Form.Item>

              {/* --- БЛОК АЛЕРТІВ (Регламент) --- */}
              {alerts.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                      {alerts.map((alert, index) => (
                          <Alert
                            key={index}
                            message={alert.message} // Текст з бекенду "⚠️ ... Прострочено ..."
                            type="error"
                            showIcon
                            icon={<ExclamationCircleOutlined />}
                            style={{ marginBottom: 8 }}
                          />
                      ))}
                  </div>
              )}

              <Form.Item label="Фотофіксація (Номер, Одометр, Панель)">
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
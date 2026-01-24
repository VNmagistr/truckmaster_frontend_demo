import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Space, Select, Tooltip } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { ordersAPI, clientsAPI, trucksAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import { ORDER_STATUSES } from '../../utils/constants';

function OrderFormPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [clients, setClients] = useState([]);
  const [trucks, setTrucks] = useState([]); // Відфільтровані авто
  const [allTrucks, setAllTrucks] = useState([]); // Всі авто
  
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  // --- ДОПОМІЖНІ ФУНКЦІЇ ---

  // Безпечний пошук (виправляє білий екран)
  const filterOption = (input, option) => {
    if (!option || !option.children) return false;
    
    let text = '';
    // Якщо children - це масив (наприклад "Ім'я" + " " + "Телефон"), склеюємо його
    if (Array.isArray(option.children)) {
      text = option.children.join('');
    } else {
      // Інакше просто перетворюємо на рядок
      text = String(option.children);
    }
    
    return text.toLowerCase().includes(input.toLowerCase());
  };

  // Отримання ID клієнта з вантажівки (для фільтрації)
  const getClientIdFromTruck = (truck) => {
    if (!truck || !truck.client) return null;
    // Якщо це об'єкт {id: 1, name: ...}
    if (typeof truck.client === 'object') {
      return truck.client.id;
    }
    // Якщо це просто число або рядок
    return truck.client;
  };

  // --- ЗАВАНТАЖЕННЯ ДАНИХ ---

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
        
        console.log('Total Trucks Loaded:', loadedTrucks.length);

        setClients(loadedClients);
        setAllTrucks(loadedTrucks);

        if (orderData) {
          // --- РЕДАГУВАННЯ ---
          const initialValues = {
            ...orderData,
            client: orderData.client?.id || orderData.client,
            truck: orderData.truck?.id || orderData.truck,
          };

          // Фільтруємо авто під клієнта при старті
          const currentClientId = initialValues.client;
          if (currentClientId) {
             const filtered = loadedTrucks.filter(t => 
                String(getClientIdFromTruck(t)) === String(currentClientId)
             );
             
             // Перестраховка: якщо авто з ордера не потрапило у фільтр - додаємо його вручну
             const currentTruckId = initialValues.truck;
             const isFound = filtered.find(t => t.id === currentTruckId);
             
             if (currentTruckId && !isFound) {
                 const missing = loadedTrucks.find(t => t.id === currentTruckId);
                 if (missing) filtered.push(missing);
             }
             
             setTrucks(filtered);
          } else {
             setTrucks(loadedTrucks);
          }
          
          form.setFieldsValue(initialValues);
        } else {
          // --- СТВОРЕННЯ ---
          setTrucks([]); // Спочатку список пустий
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

  // --- ОБРОБНИКИ ПОДІЙ ---

  const handleClientChange = (clientId) => {
    console.log('Selected Client ID:', clientId);
    form.setFieldsValue({ truck: null }); // Очистити вибір авто

    if (!clientId) {
      setTrucks([]);
      return;
    }

    // Фільтруємо список
    const filtered = allTrucks.filter(truck => {
      const ownerId = getClientIdFromTruck(truck);
      return String(ownerId) === String(clientId);
    });
    
    console.log('Filtered Trucks:', filtered.length);
    setTrucks(filtered);
  };

  const showAllTrucks = () => {
    setTrucks(allTrucks);
    message.info('Показано всі автомобілі');
  };

  const onFinish = async (values) => {
    setSaving(true);
    try {
      if (isEdit) {
        await ordersAPI.update(id, values);
        message.success('Оновлено!');
      } else {
        await ordersAPI.create(values);
        message.success('Створено!');
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

      <Card style={{ maxWidth: 800 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
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
              filterOption={filterOption} // ВИКОРИСТОВУЄМО БЕЗПЕЧНИЙ ФІЛЬТР
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
                <Form.Item
                    name="truck"
                    rules={[{ required: true, message: 'Оберіть авто' }]}
                    noStyle
                >
                    <Select
                        showSearch
                        placeholder={
                            trucks.length > 0 
                            ? "Оберіть авто зі списку" 
                            : "Немає авто (натисніть кнопку праворуч, щоб показати всі)"
                        }
                        optionFilterProp="children"
                        filterOption={filterOption} // ВИКОРИСТОВУЄМО БЕЗПЕЧНИЙ ФІЛЬТР
                        allowClear
                    >
                    {trucks.map(t => (
                        <Select.Option key={t.id} value={t.id}>
                        {t.license_plate} - {t.specific_model_name}
                        </Select.Option>
                    ))}
                    </Select>
                </Form.Item>
                <Tooltip title="Показати всі авто (ігнорувати фільтр)">
                    <Button icon={<ReloadOutlined />} onClick={showAllTrucks} />
                </Tooltip>
             </Space.Compact>
             <div style={{ marginTop: 4, fontSize: '12px', color: '#888' }}>
                Доступно для вибору: {trucks.length}
             </div>
          </Form.Item>

          <Form.Item name="status" label="Статус" style={{ marginTop: 24 }}>
            <Select>
              {Object.values(ORDER_STATUSES).map(s => (
                <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="problem_description" label="Опис проблеми">
            <Input.TextArea rows={4} placeholder="Скарги клієнта..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                {isEdit ? 'Зберегти' : 'Створити'}
              </Button>
              <Button onClick={() => navigate('/orders')}>Скасувати</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default OrderFormPage;
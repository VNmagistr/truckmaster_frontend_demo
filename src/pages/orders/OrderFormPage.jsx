import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Space, Select, Tooltip } from 'antd';
import { SaveOutlined, CarOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { ordersAPI, clientsAPI, trucksAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import { ORDER_STATUSES } from '../../utils/constants';

function OrderFormPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [clients, setClients] = useState([]);
  const [trucks, setTrucks] = useState([]); // Те, що показуємо в списку
  const [allTrucks, setAllTrucks] = useState([]); // Повна база
  
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  // Функція для отримання "чистого" ID клієнта з об'єкта вантажівки
  const getClientIdFromTruck = (truck) => {
    if (!truck || !truck.client) return null;
    // Якщо client - це об'єкт {id: 1, name: ...}
    if (typeof truck.client === 'object' && truck.client.id) {
      return truck.client.id;
    }
    // Якщо client - це просто число (ID)
    return truck.client;
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
        
        console.log('Loaded Trucks Total:', loadedTrucks.length); // ДІАГНОСТИКА

        setClients(loadedClients);
        setAllTrucks(loadedTrucks);

        if (orderData) {
          // --- РЕДАГУВАННЯ ---
          const initialValues = {
            ...orderData,
            client: orderData.client?.id || orderData.client,
            truck: orderData.truck?.id || orderData.truck,
          };
          
          // При редагуванні відразу фільтруємо список під клієнта
          const currentClientId = initialValues.client;
          let filtered = loadedTrucks;
          
          if (currentClientId) {
             filtered = loadedTrucks.filter(t => 
                String(getClientIdFromTruck(t)) === String(currentClientId)
             );
             // Якщо машина з наряду не попала в фільтр (глюк бази), додаємо її вручну
             const currentTruckId = initialValues.truck;
             if (currentTruckId && !filtered.find(t => t.id === currentTruckId)) {
                const missing = loadedTrucks.find(t => t.id === currentTruckId);
                if (missing) filtered.push(missing);
             }
          }
          
          setTrucks(filtered);
          form.setFieldsValue(initialValues);
        } else {
          // --- СТВОРЕННЯ ---
          // При старті показуємо або пустий список, або всі (залежно від логіки). 
          // Зараз покажемо пустий, щоб змусити вибрати клієнта.
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
    console.log('Selected Client ID:', clientId); // ДІАГНОСТИКА
    
    // Скидаємо вибір авто
    form.setFieldsValue({ truck: null });

    if (!clientId) {
      setTrucks([]); // Якщо клієнт не обраний - ховаємо авто
      return;
    }

    // Фільтруємо
    const filtered = allTrucks.filter(truck => {
      const truckOwnerId = getClientIdFromTruck(truck);
      // Порівнюємо як рядки, щоб уникнути проблем "5" != 5
      return String(truckOwnerId) === String(clientId);
    });

    console.log('Filtered Trucks Count:', filtered.length); // ДІАГНОСТИКА
    
    if (filtered.length === 0) {
        // Якщо нічого не знайшли, можна вивести попередження в консоль
        console.warn('No trucks found for this client. Check truck.client data structure.');
    }

    setTrucks(filtered);
  };

  // Кнопка "Показати всі" (якщо фільтр працює некоректно або треба вибрати іншу)
  const showAllTrucks = () => {
      setTrucks(allTrucks);
      message.info('Відображено всі автомобілі бази');
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
              filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
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
                        trucks.length === 0 
                        ? "Немає авто у цього клієнта (або клієнт не обраний)" 
                        : "Оберіть авто зі списку"
                    }
                    optionFilterProp="children"
                    filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
                    allowClear
                    >
                    {trucks.map(t => (
                        <Select.Option key={t.id} value={t.id}>
                        {t.license_plate} - {t.specific_model_name}
                        </Select.Option>
                    ))}
                    </Select>
                </Form.Item>
                <Tooltip title="Показати всі авто (ігнорувати фільтр по клієнту)">
                    <Button icon={<ReloadOutlined />} onClick={showAllTrucks} />
                </Tooltip>
             </Space.Compact>
             <div style={{ marginTop: 4, fontSize: '12px', color: '#888' }}>
                Знайдено авто: {trucks.length}
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
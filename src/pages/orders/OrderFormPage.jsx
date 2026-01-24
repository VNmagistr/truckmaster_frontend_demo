import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Space, Select } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { ordersAPI, clientsAPI, trucksAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import { ORDER_STATUSES } from '../../utils/constants';

function OrderFormPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [trucks, setTrucks] = useState([]); // Відфільтровані під клієнта
  const [allTrucks, setAllTrucks] = useState([]); // Повна база вантажівок
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  // Допоміжна функція для безпечного отримання ID (число або рядок)
  const getId = (item) => {
    if (!item) return null;
    return item.id || item;
  };

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // 1. Вантажимо всі довідники паралельно
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
          // --- ЛОГІКА РЕДАГУВАННЯ ---
          
          // Нормалізуємо дані (дістаємо ID з об'єктів)
          const initialValues = {
            ...orderData,
            client: getId(orderData.client),
            truck: getId(orderData.truck),
          };

          const selectedClientId = initialValues.client;

          // Фільтруємо вантажівки для цього клієнта
          // Використовуємо String(), щоб не було проблем "5" !== 5
          let filteredTrucks = loadedTrucks;
          if (selectedClientId) {
             filteredTrucks = loadedTrucks.filter(t => 
              String(getId(t.client)) === String(selectedClientId)
            );
          }
          
          // ХАК: Якщо у замовленні є вантажівка, але фільтр її чомусь відсіяв 
          // (наприклад, глюк бази даних, і машина приписана іншому клієнту),
          // ми все одно додаємо її в список, щоб Select міг відобразити її назву, а не ID.
          const currentTruckId = initialValues.truck;
          const isTruckInList = filteredTrucks.find(t => getId(t) === currentTruckId);
          
          if (currentTruckId && !isTruckInList) {
             const missingTruck = loadedTrucks.find(t => getId(t) === currentTruckId);
             if (missingTruck) {
               filteredTrucks = [...filteredTrucks, missingTruck];
             }
          }

          setTrucks(filteredTrucks);
          form.setFieldsValue(initialValues);
        } else {
          // --- ЛОГІКА СТВОРЕННЯ ---
          setTrucks(loadedTrucks); // Спочатку показуємо всі, або можна []
        }

      } catch (error) {
        console.error('Initialization error:', error);
        message.error('Не вдалося завантажити дані');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [id, isEdit, form]);

  const handleClientChange = (clientId) => {
    // Скидаємо поле авто, бо воно від іншого клієнта
    form.setFieldsValue({ truck: null });

    if (!clientId) {
      setTrucks(allTrucks);
      return;
    }

    // Безпечна фільтрація
    const filtered = allTrucks.filter(truck => 
      String(getId(truck.client)) === String(clientId)
    );
    setTrucks(filtered);
  };

  const onFinish = async (values) => {
    setSaving(true);
    try {
      if (isEdit) {
        await ordersAPI.update(id, values);
        message.success('Замовлення оновлено');
      } else {
        await ordersAPI.create(values);
        message.success('Замовлення створено');
      }
      navigate('/orders');
    } catch (error) {
      console.error('Error saving order:', error);
      message.error('Помилка при збереженні');
    } finally {
      setSaving(false);
    }
  };

  // Фільтр пошуку всередині Select (щоб не ламався від undefined)
  const filterOption = (input, option) => {
    if (!option || !option.children) return false;
    const label = Array.isArray(option.children) ? option.children.join('') : String(option.children);
    return label.toLowerCase().includes(input.toLowerCase());
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? `Редагування замовлення #${id}` : 'Нове замовлення'}
        showBack
      />

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ status: 'pending' }}
        >
          <Form.Item
            name="client"
            label="Клієнт"
            rules={[{ required: true, message: 'Оберіть клієнта' }]}
          >
            <Select
              showSearch
              placeholder="Введіть ім'я клієнта"
              optionFilterProp="children"
              filterOption={filterOption}
              onChange={handleClientChange}
            >
              {clients.map(client => (
                <Select.Option key={client.id} value={client.id}>
                  {client.name} {client.phone ? `(${client.phone})` : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="truck"
            label="Вантажівка"
            rules={[{ required: true, message: 'Оберіть вантажівку' }]}
          >
            <Select
              showSearch
              placeholder={trucks.length === 0 ? "Немає авто у цього клієнта (або клієнт не обраний)" : "Оберіть авто"}
              optionFilterProp="children"
              filterOption={filterOption}
              // Дозволяємо очистити вибір
              allowClear
            >
              {trucks.map(truck => (
                <Select.Option key={truck.id} value={truck.id}>
                  {truck.license_plate} - {truck.specific_model_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="Статус"
          >
            <Select>
              {Object.values(ORDER_STATUSES).map(status => (
                <Select.Option key={status.value} value={status.value}>
                  {status.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="problem_description"
            label="Опис проблеми"
          >
            <Input.TextArea rows={4} placeholder="Опишіть проблему зі слів клієнта" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={<SaveOutlined />}
              >
                {isEdit ? 'Зберегти зміни' : 'Створити замовлення'}
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
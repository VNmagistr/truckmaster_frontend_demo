import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Space, Select } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { ordersAPI, clientsAPI, trucksAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import { ORDER_STATUSES } from '../../utils/constants';

function OrderFormPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true); // Загальний лоадер
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [trucks, setTrucks] = useState([]); // Відфільтровані вантажівки
  const [allTrucks, setAllTrucks] = useState([]); // Всі вантажівки
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  // Завантажуємо все одразу, щоб уникнути проблем з порядком
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // 1. Паралельно вантажимо довідники та (якщо треба) замовлення
        const [clientsData, trucksData, orderData] = await Promise.all([
          clientsAPI.getAll({ page_size: 1000 }).catch(() => []),
          trucksAPI.getAll({ page_size: 1000 }).catch(() => []),
          isEdit ? ordersAPI.getById(id) : Promise.resolve(null)
        ]);

        // 2. Зберігаємо довідники
        const loadedClients = clientsData.results || clientsData || [];
        const loadedTrucks = trucksData.results || trucksData || [];
        
        setClients(loadedClients);
        setAllTrucks(loadedTrucks);

        // 3. Якщо це редагування - заповнюємо форму
        if (orderData) {
          // ВАЖЛИВО: Витягуємо ID з об'єктів, щоб Select їх зрозумів
          const formData = {
            ...orderData,
            client: orderData.client?.id || orderData.client,
            truck: orderData.truck?.id || orderData.truck,
          };

          // Фільтруємо список машин під цього клієнта
          if (formData.client) {
            const clientTrucks = loadedTrucks.filter(t => 
              (t.client?.id || t.client) === formData.client
            );
            setTrucks(clientTrucks);
          } else {
            setTrucks(loadedTrucks);
          }

          form.setFieldsValue(formData);
        } else {
          // Якщо створення нового - показуємо всі машини або пустий список
          setTrucks(loadedTrucks); 
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
    // При зміні клієнта фільтруємо список машин
    const filtered = allTrucks.filter(truck => {
      const truckClientId = truck.client?.id || truck.client;
      return String(truckClientId) === String(clientId);
    });
    setTrucks(filtered);
    
    // Очищаємо поле машини, бо стара машина може не належати новому клієнту
    form.setFieldsValue({ truck: null });
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

  // Безпечна функція пошуку для Select
  const safeFilterOption = (input, option) => {
    if (!option || !option.children) return false;
    
    // Якщо children - це масив (наприклад "AA1234AA" + " - " + "Model"), з'єднуємо його
    const label = Array.isArray(option.children) 
      ? option.children.join('') 
      : String(option.children);
      
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
              filterOption={safeFilterOption} // ВИПРАВЛЕНО: безпечний пошук
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
              placeholder={trucks.length === 0 ? "Спочатку оберіть клієнта" : "Введіть номер авто"}
              optionFilterProp="children"
              filterOption={safeFilterOption} // ВИПРАВЛЕНО: безпечний пошук
              notFoundContent={trucks.length === 0 ? "Немає авто у цього клієнта" : null}
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
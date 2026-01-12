import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Space, Select } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { ordersAPI, clientsAPI, trucksAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import { ORDER_STATUSES } from '../../utils/constants';

function OrderFormPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [allTrucks, setAllTrucks] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  useEffect(() => {
    fetchClients();
    fetchAllTrucks();
    if (isEdit) {
      fetchOrder();
    }
  }, [id]);

  const fetchClients = async () => {
    try {
      const response = await clientsAPI.getAll({ page_size: 1000 });
      const data = response.results || response;
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchAllTrucks = async () => {
    try {
      const response = await trucksAPI.getAll({ page_size: 1000 });
      const data = response.results || response;
      setAllTrucks(Array.isArray(data) ? data : []);
      setTrucks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching trucks:', error);
    }
  };

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const data = await ordersAPI.getById(id);
      form.setFieldsValue({
        ...data,
        client: data.client?.id || data.client,
        truck: data.truck?.id || data.truck,
      });
      
      if (data.client?.id || data.client) {
        handleClientChange(data.client?.id || data.client);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      message.error('Не вдалося завантажити дані замовлення');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = async (clientId) => {
    if (clientId) {
      const filteredTrucks = allTrucks.filter(
        truck => truck.client === clientId || truck.client?.id === clientId
      );
      setTrucks(filteredTrucks);
      
      const currentTruck = form.getFieldValue('truck');
      if (currentTruck && !filteredTrucks.find(t => t.id === currentTruck)) {
        form.setFieldValue('truck', undefined);
      }
    } else {
      setTrucks(allTrucks);
    }
  };

  const onFinish = async (values) => {
    setSaving(true);
    try {
      if (isEdit) {
        await ordersAPI.update(id, values);
        message.success('Замовлення успішно оновлено');
      } else {
        await ordersAPI.create(values);
        message.success('Замовлення успішно створено');
      }
      navigate('/orders');
    } catch (error) {
      console.error('Error saving order:', error);
      if (error.response?.data) {
        const errors = error.response.data;
        Object.keys(errors).forEach(key => {
          message.error(`${key}: ${errors[key]}`);
        });
      } else {
        message.error('Не вдалося зберегти замовлення');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Редагувати замовлення' : 'Нове замовлення'}
        showBack
      />

      <Card style={{ maxWidth: 600 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            status: 'OPEN',
          }}
        >
          <Form.Item
            name="order_number"
            label="Номер замовлення"
          >
            <Input placeholder="Автоматично або введіть вручну" />
          </Form.Item>

          <Form.Item
            name="client"
            label="Клієнт"
            rules={[{ required: true, message: 'Оберіть клієнта' }]}
          >
            <Select
              placeholder="Оберіть клієнта"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
              onChange={handleClientChange}
            >
              {clients.map(client => (
                <Select.Option key={client.id} value={client.id}>
                  {client.name}
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
              placeholder="Оберіть вантажівку"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
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
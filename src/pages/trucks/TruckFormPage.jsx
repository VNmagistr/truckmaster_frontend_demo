import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Space, Select } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { trucksAPI, clientsAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import { EURO_STANDARDS } from '../../utils/constants';

function TruckFormPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [baseModels, setBaseModels] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  useEffect(() => {
    fetchClients();
    fetchBaseModels();
    if (isEdit) {
      fetchTruck();
    }
  }, [id]);

  const fetchClients = async () => {
    try {
      const response = await clientsAPI.getAll({ page_size: 1000 });
      // 🔥 ВИПРАВЛЕННЯ: Розпаковка .data
      const data = response.data || response;
      setClients(data.results || data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchBaseModels = async () => {
    try {
      // Тут використовується fetch, а не axios, тому response.json() коректний,
      // але треба перевірити структуру відповіді
      const response = await fetch('/api/base-models/');
      if (response.ok) {
        const data = await response.json();
        setBaseModels(data.results || data || []);
      }
    } catch (error) {
      console.error('Error fetching base models:', error);
      // Фоллбек дані
      setBaseModels([
        { id: 1, name: 'Daily' },
        { id: 2, name: 'Eurocargo' },
        { id: 3, name: 'Stralis' },
        { id: 4, name: 'Trakker' },
        { id: 5, name: 'S-Way' },
      ]);
    }
  };

  const fetchTruck = async () => {
    setLoading(true);
    try {
      const response = await trucksAPI.getById(id);
      // 🔥 ВИПРАВЛЕННЯ: Розпаковка .data
      const data = response.data || response;
      
      form.setFieldsValue({
        ...data,
        client: data.client?.id || data.client,
        base_model: data.base_model?.id || data.base_model,
      });
    } catch (error) {
      console.error('Error fetching truck:', error);
      message.error('Не вдалося завантажити дані вантажівки');
      navigate('/trucks');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    setSaving(true);
    try {
      if (isEdit) {
        await trucksAPI.update(id, values);
        message.success('Вантажівку оновлено');
      } else {
        await trucksAPI.create(values);
        message.success('Вантажівку створено');
      }
      navigate('/trucks');
    } catch (error) {
      console.error('Error saving truck:', error);
      if (error.response?.data) {
        const errors = error.response.data;
        Object.keys(errors).forEach(key => {
          const errorMsg = Array.isArray(errors[key]) ? errors[key].join(', ') : errors[key];
          message.error(`${key}: ${errorMsg}`);
        });
      } else {
        message.error('Не вдалося зберегти вантажівку');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Редагувати вантажівку' : 'Нова вантажівка'}
        showBack
      />

      <Card style={{ maxWidth: 600 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="license_plate"
            label="Номерний знак"
            rules={[{ required: true, message: 'Введіть номерний знак' }]}
          >
            <Input placeholder="AA0000BB" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            name="full_vin"
            label="Повний VIN код"
            rules={[
              { required: true, message: 'Введіть VIN код' },
              { len: 17, message: 'VIN код має містити 17 символів' },
            ]}
          >
            <Input placeholder="17 символів" maxLength={17} style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            name="specific_model_name"
            label="Модель"
            rules={[{ required: true, message: 'Введіть модель' }]}
          >
            <Input placeholder="Наприклад: 35C15, 70C17" />
          </Form.Item>

          <Form.Item
            name="base_model"
            label="Базова модель"
          >
            <Select placeholder="Оберіть базову модель" allowClear>
              {baseModels.map(model => (
                <Select.Option key={model.id} value={model.id}>
                  {model.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="euro_standard"
            label="Євростандарт"
          >
            <Select placeholder="Оберіть євростандарт" allowClear>
              {Object.values(EURO_STANDARDS).map(euro => (
                <Select.Option key={euro.value} value={euro.value}>
                  {euro.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="client"
            label="Власник"
          >
            <Select
              placeholder="Оберіть власника"
              allowClear
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {clients.map(client => (
                <Select.Option key={client.id} value={client.id}>
                  {client.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={<SaveOutlined />}
              >
                {isEdit ? 'Зберегти зміни' : 'Створити вантажівку'}
              </Button>
              <Button onClick={() => navigate('/trucks')}>Скасувати</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default TruckFormPage;
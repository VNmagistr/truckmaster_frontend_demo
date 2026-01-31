import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Space } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { clientsAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';

function ClientFormPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  useEffect(() => {
    if (isEdit) {
      fetchClient();
    }
  }, [id]);

  const fetchClient = async () => {
    setLoading(true);
    try {
      const response = await clientsAPI.getById(id);
      // 🔥 ВИПРАВЛЕННЯ: Беремо дані з .data
      const data = response.data || response;
      form.setFieldsValue(data);
    } catch (error) {
      console.error('Error fetching client:', error);
      message.error('Не вдалося завантажити дані клієнта');
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    setSaving(true);
    try {
      if (isEdit) {
        await clientsAPI.update(id, values);
        message.success('Дані клієнта оновлено');
      } else {
        await clientsAPI.create(values);
        message.success('Клієнта створено');
      }
      navigate('/clients');
    } catch (error) {
      console.error('Save error:', error);
      message.error('Не вдалося зберегти дані');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={isEdit ? 'Редагування клієнта' : 'Новий клієнт'} showBack />
      
      <Card style={{ maxWidth: 800, margin: '0 auto' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            active: true
          }}
        >
          <Form.Item
            name="name"
            label="Ім'я / Назва компанії"
            rules={[{ required: true, message: "Введіть ім'я клієнта" }]}
          >
            <Input placeholder="Введіть ім'я або назву компанії" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Телефон"
            rules={[
              { pattern: /^\+?[\d\s\-()]+$/, message: 'Невірний формат телефону' },
            ]}
          >
            <Input placeholder="+380XXXXXXXXX" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: 'email', message: 'Невірний формат email' }]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>

          <Form.Item name="address" label="Адреса">
            <Input.TextArea rows={3} placeholder="Введіть адресу" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={<SaveOutlined />}
              >
                {isEdit ? 'Зберегти зміни' : 'Створити клієнта'}
              </Button>
              <Button onClick={() => navigate('/clients')}>
                Скасувати
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default ClientFormPage;
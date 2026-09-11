import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Space } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clientsAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';

function ClientFormPage() {
  const { t } = useTranslation();
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
      message.error(t('clients.loadDetailError'));
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
        message.success(t('clients.updateSuccess'));
      } else {
        await clientsAPI.create(values);
        message.success(t('clients.createSuccess'));
      }
      navigate('/clients');
    } catch (error) {
      if (error.response?.data) {
          const errors = error.response.data;
          // Якщо сервер повернув помилки валідації
          Object.keys(errors).forEach(key => {
             // Виводимо або строкою, або якщо це масив - джойнимо
             const errorMsg = Array.isArray(errors[key]) ? errors[key].join(', ') : errors[key];
             message.error(`${key}: ${errorMsg}`);
          });
      } else {
          message.error(t('clients.saveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title={isEdit ? t('clients.editClient') : t('clients.newClient')}
        showBack
      />

      <Card style={{ maxWidth: 600 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            name: '',
            phone: '',
            email: '',
            address: '',
          }}
        >
          <Form.Item
            name="name"
            label={t('clients.nameOrCompanyFull')}
            rules={[{ required: true, message: t('clients.nameOrCompanyPlaceholder') }]}
          >
            <Input placeholder={t('clients.nameOrCompanyHelp')} />
          </Form.Item>

          <Form.Item
            name="phone"
            label={t('common.phone')}
            rules={[
              { pattern: /^\+?[\d\s\-()]+$/, message: t('clients.phoneError') },
            ]}
          >
            <Input placeholder={t('clients.phonePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="email"
            label={t('common.email')}
            rules={[{ type: 'email', message: t('clients.emailError') }]}
          >
            <Input placeholder={t('clients.emailPlaceholder')} />
          </Form.Item>

          <Form.Item name="address" label={t('common.address')}>
            <Input.TextArea rows={3} placeholder={t('clients.addressPlaceholder')} />
          </Form.Item>

          <Form.Item name="notes" label={t('clients.notes')}>
            <Input.TextArea rows={3} placeholder={t('clients.notesPlaceholder')} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={<SaveOutlined />}
              >
                {isEdit ? t('common.saveChanges') : t('clients.addClient')}
              </Button>
              <Button onClick={() => navigate('/clients')}>{t('common.cancel')}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default ClientFormPage;
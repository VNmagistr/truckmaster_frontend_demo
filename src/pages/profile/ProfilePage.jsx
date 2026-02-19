import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Tabs, message, Modal, Row, Col, Typography, Avatar, Divider, Alert } from 'antd';
import { UserOutlined, SaveOutlined, LockOutlined, DeleteOutlined, ExclamationCircleOutlined, PhoneOutlined, IdcardOutlined } from '@ant-design/icons';
import { userAPI } from '../../api'; 
import { PageHeader, LoadingSpinner } from '../../components'; 

const { Title, Text } = Typography;
const { confirm } = Modal;

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formProfile] = Form.useForm();
  const [formPassword] = Form.useForm();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const response = await userAPI.getMe();
      const data = response.data || response;
      setUser(data);
      formProfile.setFieldsValue(data);
    } catch (error) {
      message.error('Не вдалося завантажити дані профілю');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (values) => {
    setSaving(true);
    try {
      const response = await userAPI.updateMe(values);
      const data = response.data || response;
      setUser(data);
      message.success('Профіль оновлено');
    } catch (error) {
      message.error('Помилка оновлення профілю');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (values) => {
    setSaving(true);
    try {
      await userAPI.changePassword(values);
      message.success('Пароль успішно змінено');
      formPassword.resetFields();
    } catch (error) {
      const errorMsg = error.response?.data?.old_password?.[0] || 'Помилка зміни паролю';
      message.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const showDeleteConfirm = () => {
    confirm({
      title: 'Ви впевнені, що хочете видалити акаунт?',
      icon: <ExclamationCircleOutlined style={{ color: 'red' }} />,
      content: 'Ваш акаунт буде деактивовано. Ви втратите доступ до системи.',
      okText: 'Деактивувати',
      okType: 'danger',
      cancelText: 'Скасувати',
      onOk: handleDeleteAccount,
    });
  };

  const handleDeleteAccount = async () => {
    try {
      await userAPI.deleteMe();
      message.success('Акаунт деактивовано');
      localStorage.removeItem('token'); 
      window.location.href = '/login';
    } catch (error) {
      message.error('Не вдалося видалити акаунт');
    }
  };

  if (loading) return <LoadingSpinner />;

  const items = [
    {
      key: '1',
      label: 'Особисті дані',
      children: (
        <Form
          form={formProfile}
          layout="vertical"
          onFinish={handleUpdateProfile}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Логін" name="username">
                <Input disabled prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Email" name="email" rules={[{ type: 'email' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Ім'я" name="first_name">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Прізвище" name="last_name">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Телефон" name="phone">
                <Input prefix={<PhoneOutlined />} placeholder="+380..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Посада" name="position">
                <Input prefix={<IdcardOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
            Зберегти зміни
          </Button>
        </Form>
      ),
    },
    {
      key: '2',
      label: 'Безпека',
      children: (
        <Form form={formPassword} layout="vertical" onFinish={handleChangePassword}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item 
                label="Поточний пароль" 
                name="old_password" 
                rules={[{ required: true, message: 'Введіть поточний пароль' }]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item 
                label="Новий пароль" 
                name="new_password"
                rules={[{ required: true, message: 'Введіть новий пароль', min: 6 }]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item 
                label="Підтвердження паролю" 
                name="confirm_password"
                dependencies={['new_password']}
                rules={[
                  { required: true, message: 'Підтвердіть пароль' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('new_password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Паролі не співпадають!'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
            Змінити пароль
          </Button>
        </Form>
      ),
    },
    {
      key: '3',
      label: <span style={{ color: '#ff4d4f' }}>Небезпечна зона</span>,
      children: (
        <div>
          <Alert
            message="Видалення акаунту"
            description="Ваш акаунт буде деактивовано. Ви втратите доступ до системи."
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" danger icon={<DeleteOutlined />} onClick={showDeleteConfirm}>
            Деактивувати мій акаунт
          </Button>
        </div>
      ),
    }
  ];

  return (
    <div>
      <PageHeader title="Мій профіль" showBack />
      
      <Row gutter={24}>
        <Col xs={24} lg={8}>
          <Card style={{ textAlign: 'center', marginBottom: 24 }}>
            <Avatar 
              size={100} 
              icon={<UserOutlined />} 
              style={{ backgroundColor: '#1890ff', marginBottom: 16 }}
            >
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Avatar>
            <Title level={4}>{user?.full_name}</Title>
            <Text type="secondary">{user?.email}</Text>
            <Divider />
            <div style={{ textAlign: 'left' }}>
              <p><Text strong>Роль:</Text> {user?.role}</p>
              <p><Text strong>Телефон:</Text> {user?.phone || '-'}</p>
              <p><Text strong>Посада:</Text> {user?.position || '-'}</p>
              <p><Text strong>Дата реєстрації:</Text> {new Date(user?.date_joined).toLocaleDateString()}</p>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={16}>
          <Card>
            <Tabs defaultActiveKey="1" items={items} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default ProfilePage;
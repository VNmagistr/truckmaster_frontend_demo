import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Tabs, message, Modal, Row, Col, Typography, Avatar, Divider, Alert } from 'antd';
import { UserOutlined, SaveOutlined, LockOutlined, DeleteOutlined, ExclamationCircleOutlined, PhoneOutlined, IdcardOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { userAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components'; 

const { Title, Text } = Typography;
const { confirm } = Modal;

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

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
      message.error(t('profile.loadError'));
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
      message.success(t('profile.updateSuccess'));
    } catch (error) {
      message.error(t('profile.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (values) => {
    setSaving(true);
    try {
      await userAPI.changePassword(values);
      message.success(t('profile.passwordSuccess'));
      formPassword.resetFields();
    } catch (error) {
      const errorMsg = error.response?.data?.old_password?.[0] || t('profile.passwordError');
      message.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const showDeleteConfirm = () => {
    confirm({
      title: t('profile.confirmDeleteAccount'),
      icon: <ExclamationCircleOutlined style={{ color: 'red' }} />,
      content: t('profile.deleteAccountDesc'),
      okText: t('profile.deactivate'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: handleDeleteAccount,
    });
  };

  const handleDeleteAccount = async () => {
    try {
      await userAPI.deleteMe();
      message.success(t('profile.deleteSuccess'));
      localStorage.removeItem('token');
      window.location.href = '/login';
    } catch (error) {
      message.error(t('profile.deleteError'));
    }
  };

  if (loading) return <LoadingSpinner />;

  const items = [
    {
      key: '1',
      label: t('profile.personalData'),
      children: (
        <Form
          form={formProfile}
          layout="vertical"
          onFinish={handleUpdateProfile}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label={t('profile.login')} name="username">
                <Input disabled prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label={t('profile.email')} name="email" rules={[{ type: 'email' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label={t('profile.firstName')} name="first_name">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label={t('profile.lastName')} name="last_name">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label={t('profile.phone')} name="phone">
                <Input prefix={<PhoneOutlined />} placeholder={t('profile.phonePlaceholder')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label={t('profile.position')} name="position">
                <Input prefix={<IdcardOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
            {t('common.saveChanges')}
          </Button>
        </Form>
      ),
    },
    {
      key: '2',
      label: t('profile.security'),
      children: (
        <Form form={formPassword} layout="vertical" onFinish={handleChangePassword}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label={t('profile.currentPassword')}
                name="old_password"
                rules={[{ required: true, message: t('profile.currentPasswordPlaceholder') }]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label={t('profile.newPassword')}
                name="new_password"
                rules={[{ required: true, message: t('profile.newPasswordPlaceholder'), min: 6 }]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label={t('profile.confirmPassword')}
                name="confirm_password"
                dependencies={['new_password']}
                rules={[
                  { required: true, message: t('profile.confirmPasswordPlaceholder') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('new_password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error(t('profile.passwordsMismatch')));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
            {t('profile.changePassword')}
          </Button>
        </Form>
      ),
    },
    {
      key: '3',
      label: <span style={{ color: '#ff4d4f' }}>{t('profile.dangerZone')}</span>,
      children: (
        <div>
          <Alert
            message={t('profile.deleteAccount')}
            description={t('profile.deleteAccountDesc')}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" danger icon={<DeleteOutlined />} onClick={showDeleteConfirm}>
            {t('profile.deactivateMyAccount')}
          </Button>
        </div>
      ),
    }
  ];

  return (
    <div>
      <PageHeader title={t('profile.title')} showBack />
      
      <Row gutter={24}>
        <Col xs={24} lg={8}>
          <Card style={{ textAlign: 'center', marginBottom: 24 }}>
            <Avatar 
              size={100} 
              icon={<UserOutlined />} 
              style={{ backgroundColor: '#f5c518', color: '#1a1a1a', marginBottom: 16 }}
            >
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Avatar>
            <Title level={4}>{user?.full_name}</Title>
            <Text type="secondary">{user?.email}</Text>
            <Divider />
            <div style={{ textAlign: 'left' }}>
              <p><Text strong>{t('profile.role')}</Text> {user?.role}</p>
              <p><Text strong>{t('profile.phoneLabel')}</Text> {user?.phone || '-'}</p>
              <p><Text strong>{t('profile.positionLabel')}</Text> {user?.position || '-'}</p>
              <p><Text strong>{t('profile.registrationDate')}</Text> {new Date(user?.date_joined).toLocaleDateString()}</p>
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
import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../api';
import useAuthStore from '../../store/authStore';

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await authAPI.login(values);
      
      // 🔥 ВИПРАВЛЕННЯ ТУТ:
      // Axios повертає дані всередині об'єкта .data
      // Було: response.access (це undefined)
      // Стало: response.data.access
      const { access, refresh } = response.data; 

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      const userData = { username: values.username };
      
      setAuth(userData, access, refresh);
      
      message.success('Успішний вхід!');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      message.error('Невірний логін або пароль');
    } finally {
      setLoading(false);
    }
  };

  const Y = '#f5c518';
  const INK = '#1a1a1a';

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 400,
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        borderTop: `4px solid ${Y}`,
        padding: '32px 32px 28px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontWeight: 800, fontSize: 20, color: INK }}>Вхід для співробітників</div>
      </div>
      <Form
        name="login"
        onFinish={onFinish}
        layout="vertical"
        size="large"
      >
        <Form.Item
          name="username"
          rules={[{ required: true, message: 'Введіть логін' }]}
        >
          <Input
            prefix={<UserOutlined style={{ color: '#bbb' }} />}
            placeholder="Логін"
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Введіть пароль' }]}
          style={{ marginBottom: 24 }}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#bbb' }} />}
            placeholder="Пароль"
            autoComplete="current-password"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={loading} block
            style={{ height: 44, fontWeight: 700, fontSize: 15 }}
          >
            Увійти
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

export default LoginPage;
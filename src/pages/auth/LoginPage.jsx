import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Checkbox } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../api';
import useAuthStore from '../../store/authStore';

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const onFinish = async (values) => {
    setLoading(true);
    
    // ОЧИЩАЄМО СТАРІ ТОКЕНИ
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    console.log('🧹 Cleared old tokens');
    
    try {
      const response = await authAPI.login(values.username, values.password);
      console.log('🔑 Login response:', { 
        hasAccess: !!response.access, 
        hasRefresh: !!response.refresh 
      });
      
      const userData = {
        username: values.username,
      };
      
      setAuth(userData, response.access, response.refresh);
      message.success('Успішний вхід!');
      
      // Даємо час Zustand зберегти state
      setTimeout(() => {
        console.log('🚀 Navigating to dashboard');
        navigate('/dashboard');
      }, 100);
    } catch (error) {
      console.error('❌ Login error:', error);
      if (error.response?.status === 401) {
        message.error('Невірний логін або пароль');
      } else {
        message.error('Помилка входу. Спробуйте пізніше.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      style={{
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Вхід в систему</h2>
      </div>
      <Form
        name="login"
        initialValues={{ remember: true }}
        onFinish={onFinish}
        layout="vertical"
        size="large"
      >
        <Form.Item
          name="username"
          rules={[{ required: true, message: 'Введіть логін' }]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Логін"
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Введіть пароль' }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Пароль"
            autoComplete="current-password"
          />
        </Form.Item>

        <Form.Item>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>Запам'ятати мене</Checkbox>
            </Form.Item>
          </div>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Увійти
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

export default LoginPage;

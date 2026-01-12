import React from 'react';
import { Layout, Typography } from 'antd';
import { Outlet } from 'react-router-dom';

const { Content } = Layout;
const { Title } = Typography;

function AuthLayout() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '50px 20px',
        }}
      >
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <Title level={1} style={{ margin: 0, color: '#1890ff' }}>
            TruckMaster
          </Title>
          <Title level={5} style={{ margin: '8px 0 0', fontWeight: 'normal', color: '#666' }}>
            Система управління сервісним центром Iveco
          </Title>
        </div>
        <Outlet />
      </Content>
    </Layout>
  );
}

export default AuthLayout;
import React from 'react';
import { Layout } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';

const { Content } = Layout;

const Y = '#f5c518';
const INK = '#1a1a1a';

function AuthLayout() {
  const navigate = useNavigate();
  return (
    <Layout style={{ minHeight: '100vh', background: '#f7f7f7' }}>
      <Content
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 20px',
        }}
      >
        <div
          style={{ marginBottom: 32, textAlign: 'center', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          <img src={logoImg} alt="Італ Трак" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 12 }} />
          <div style={{ fontWeight: 900, fontSize: 24, color: INK, letterSpacing: 0.5, lineHeight: 1.1 }}>
            Італ Трак
          </div>
          <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 }}>
            CRM — Система управління
          </div>
        </div>
        <Outlet />
        <div style={{ marginTop: 32, fontSize: 12, color: '#aaa' }}>
          © {new Date().getFullYear()} Італ Трак. Всі права захищені.
        </div>
      </Content>
    </Layout>
  );
}

export default AuthLayout;
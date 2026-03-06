import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import {
  CarOutlined, FileTextOutlined, UserOutlined, LogoutOutlined, HomeOutlined,
} from '@ant-design/icons';
import useCabinetAuthStore from '../store/cabinetAuthStore';

const Y = '#f5c518';
const INK = '#1a1a1a';
const BG = '#f7f7f7';

const NAV_ITEMS = [
  { path: '/cabinet', icon: <HomeOutlined />, label: 'Головна' },
  { path: '/cabinet/trucks', icon: <CarOutlined />, label: 'Авто' },
  { path: '/cabinet/orders', icon: <FileTextOutlined />, label: 'Замовлення' },
  { path: '/cabinet/profile', icon: <UserOutlined />, label: 'Профіль' },
];

export default function CabinetLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useCabinetAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/cabinet/login');
  };

  const isActive = (path) =>
    path === '/cabinet'
      ? location.pathname === '/cabinet'
      : location.pathname.startsWith(path);

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Top header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#fff', borderBottom: `3px solid ${Y}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        padding: '0 16px',
      }}>
        <div style={{
          maxWidth: 960, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 60,
        }}>
          {/* Logo */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => navigate('/cabinet')}
          >
            <img src={logoImg} alt="Італ Трак" style={{ width: 42, height: 42, objectFit: 'contain' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: INK, lineHeight: 1.1 }}>Італ Трак</div>
              <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 1.5 }}>Кабінет клієнта</div>
            </div>
          </div>

          {/* Right: user + logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 14, color: '#555', display: 'none' }} className="cab-desktop-name">
              {user?.name}
            </span>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: `1px solid #e0e0e0`, color: '#666',
                padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                transition: 'all 0.2s', borderRadius: 4,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = Y; e.currentTarget.style.color = INK; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.color = '#666'; }}
            >
              <LogoutOutlined /> Вийти
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 100px' }}>
        <Outlet />
      </main>

      {/* ── Bottom navigation (mobile) ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: '#fff', borderTop: `3px solid ${Y}`,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        display: 'flex',
      }}>
        {NAV_ITEMS.map(({ path, icon, label }) => {
          const active = isActive(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '10px 0', background: 'none', border: 'none',
                color: active ? INK : '#aaa', cursor: 'pointer',
                borderTop: active ? `3px solid ${Y}` : '3px solid transparent',
                marginTop: -3, transition: 'color 0.2s',
              }}
            >
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500 }}>{label}</span>
            </button>
          );
        })}
      </nav>

      <style>{`
        @media (min-width: 769px) {
          .cab-desktop-name { display: inline !important; }
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

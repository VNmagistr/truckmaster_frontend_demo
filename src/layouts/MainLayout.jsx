import React, { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Grid, Drawer, Tooltip } from 'antd';
import {
  DashboardOutlined, UserOutlined, CarOutlined, FileTextOutlined,
  AppstoreOutlined, RobotOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  LogoutOutlined, SettingOutlined, MenuOutlined, PlusOutlined, CalendarOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import logoImg from '../assets/logo.jpg';

const { Header, Sider, Content } = Layout;

const Y = '#f5c518';
const INK = '#1a1a1a';
const SIDEBAR_BG = '#1a1a1a';

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleMenuClick = ({ key }) => {
    navigate(key);
    if (isMobile) setDrawerOpen(false);
  };

  const quickAddLabel = (text, newPath) => (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span>{text}</span>
      <Tooltip title="Додати" placement="right" mouseEnterDelay={0.5}>
        <PlusOutlined
          style={{ fontSize: 11, opacity: 0.55, padding: '2px 2px 2px 6px' }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(newPath);
            if (isMobile) setDrawerOpen(false);
          }}
        />
      </Tooltip>
    </span>
  );

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Головна' },
    { key: '/clients',   icon: <UserOutlined />,      label: quickAddLabel('Клієнти',    '/clients/new') },
    { key: '/trucks',    icon: <CarOutlined />,        label: quickAddLabel('Вантажівки', '/trucks/new') },
    { key: '/orders',    icon: <FileTextOutlined />,   label: quickAddLabel('Замовлення', '/orders/new') },
    { key: '/inventory', icon: <AppstoreOutlined />,   label: quickAddLabel('Склад',      '/inventory/new') },
    { key: '/appointments', icon: <CalendarOutlined />, label: 'Записи' },
    { key: '/bot',       icon: <RobotOutlined />,      label: 'Telegram бот' },
    { key: '/alpr',      icon: <CameraOutlined />,     label: 'Журнал авто' },
  ];

  const selectedKey = '/' + location.pathname.split('/')[1];

  const handleUserMenuClick = ({ key }) => {
    if (key === 'settings') navigate('/profile');
    else if (key === 'logout') { logout(); navigate('/'); }
  };

  const userMenuItems = [
    { key: 'settings', icon: <SettingOutlined />, label: 'Налаштування' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Вийти', danger: true },
  ];

  const LogoBlock = ({ collapsed }) => (
    <div
      style={{
        height: 64, display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? 0 : '0 16px',
        gap: 10, cursor: 'pointer',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
      onClick={() => navigate('/dashboard')}
    >
      <img src={logoImg} alt="Італ Трак" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
      {!collapsed && (
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, lineHeight: 1.1, letterSpacing: 0.3 }}>Італ Трак</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>CRM</div>
        </div>
      )}
    </div>
  );

  const sideMenu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[selectedKey]}
      items={menuItems}
      onClick={handleMenuClick}
      style={{ borderRight: 0, background: SIDEBAR_BG }}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop Sider */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={sidebarCollapsed}
          style={{
            overflow: 'auto', height: '100vh',
            position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
            background: SIDEBAR_BG,
          }}
        >
          <LogoBlock collapsed={sidebarCollapsed} />
          {sideMenu}
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={240}
          styles={{
            header: { background: SIDEBAR_BG, borderBottom: '1px solid rgba(255,255,255,0.08)' },
            body: { padding: 0, background: SIDEBAR_BG },
          }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={logoImg} alt="Італ Трак" style={{ width: 32, height: 32, objectFit: 'contain' }} />
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Італ Трак</span>
            </div>
          }
          closeIcon={<span style={{ color: 'rgba(255,255,255,0.65)' }}>✕</span>}
        >
          {sideMenu}
        </Drawer>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : (sidebarCollapsed ? 80 : 200), transition: 'all 0.2s' }}>
        {/* Header */}
        <Header style={{
          padding: '0 16px', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 99,
          boxShadow: '0 2px 0 0 ' + Y,
        }}>
          {isMobile ? (
            <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)}
              style={{ fontSize: 18, width: 48, height: 48, color: INK }} />
          ) : (
            <Button type="text"
              icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleSidebar}
              style={{ fontSize: 16, width: 56, height: 56, color: INK }} />
          )}

          {isMobile && (
            <span style={{ fontWeight: 800, fontSize: 16, color: INK, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
              Італ Трак
            </span>
          )}

          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight" arrow>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 12, padding: '0 8px' }}>
              {!isMobile && (
                <span style={{ fontWeight: 600, fontSize: 14, color: INK }}>{user?.username || 'Користувач'}</span>
              )}
              <Avatar icon={<UserOutlined />} style={{ background: Y, color: INK, fontWeight: 700 }} />
            </div>
          </Dropdown>
        </Header>

        {/* Content */}
        <Content style={{
          margin: isMobile ? '12px' : '24px',
          padding: isMobile ? 12 : 24,
          minHeight: 280,
          background: '#fff',
          borderRadius: 4,
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;

import React from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, theme } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  CarOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  RobotOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';

const { Header, Sider, Content } = Layout;

// Основне меню (ліва колонка)
const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: 'Головна',
  },
  {
    key: '/clients',
    icon: <UserOutlined />,
    label: 'Клієнти',
  },
  {
    key: '/trucks',
    icon: <CarOutlined />,
    label: 'Вантажівки',
  },
  {
    key: '/orders',
    icon: <FileTextOutlined />,
    label: 'Замовлення',
  },
  {
    key: '/inventory',
    icon: <AppstoreOutlined />,
    label: 'Склад',
  },
  {
    key: '/bot',
    icon: <RobotOutlined />,
    label: 'Telegram бот',
  },
];

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Клік по лівому меню
  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  // Клік по меню користувача (верхній правий кут)
  const handleUserMenuClick = ({ key }) => {
    if (key === 'settings') {
      navigate('/profile'); // Перехід на сторінку профілю
    } else if (key === 'logout') {
      logout();
      navigate('/');
    }
  };

  // Описуємо пункти меню користувача (Тільки дані, без функцій)
  const userMenuItems = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Налаштування',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Вийти',
      danger: true,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={sidebarCollapsed}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: sidebarCollapsed ? '16px' : '20px',
            fontWeight: 'bold',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/dashboard')}
        >
          {sidebarCollapsed ? 'TM' : 'TruckMaster'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout style={{ marginLeft: sidebarCollapsed ? 80 : 200, transition: 'all 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <Button
            type="text"
            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleSidebar}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          
          {/* Меню користувача */}
          <Dropdown 
            menu={{ 
              items: userMenuItems, 
              onClick: handleUserMenuClick // <--- ГОЛОВНЕ ВИПРАВЛЕННЯ ТУТ
            }} 
            placement="bottomRight"
            arrow
          >
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px' }}>
              <span style={{ fontWeight: 500 }}>{user?.username || 'Користувач'}</span>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
            </div>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: '24px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;
import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Grid, Drawer, Tooltip, Alert } from 'antd';
import {
  DashboardOutlined, UserOutlined, CarOutlined, FileTextOutlined,
  AppstoreOutlined, RobotOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  LogoutOutlined, SettingOutlined, MenuOutlined, PlusOutlined, CalendarOutlined,
  CameraOutlined, BellOutlined, FileDoneOutlined, DownloadOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import PWAUpdatePrompt from '../components/PWAUpdatePrompt';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import useModulesStore from '../store/modulesStore';
import useEnumsStore from '../store/enumsStore';
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
  const { fetchModules, isEnabled } = useModulesStore();
  const fetchEnums = useEnumsStore((s) => s.fetchEnums);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDemo = import.meta.env.VITE_IS_DEMO === 'true';
  const [demoBannerVisible, setDemoBannerVisible] = useState(
    isDemo && localStorage.getItem('demo_banner_dismissed') !== '1'
  );

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const [canInstall, setCanInstall] = useState(
    !isStandalone && !!window.__pwaInstallPrompt
  );

  useEffect(() => {
    const handler = () => setCanInstall(true);
    window.addEventListener('pwainstallready', handler);
    return () => window.removeEventListener('pwainstallready', handler);
  }, []);

  const handleInstallPWA = async () => {
    const prompt = window.__pwaInstallPrompt;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      window.__pwaInstallPrompt = null;
      setCanInstall(false);
    }
  };

  useEffect(() => { fetchModules(); fetchEnums(); }, []);

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

  // Прив'язка пунктів меню до назв модулів (null = core, завжди видимий)
  const ALL_MENU_ITEMS = [
    { key: '/dashboard',    module: null,          icon: <DashboardOutlined />, label: 'Головна' },
    { key: '/clients',      module: null,          icon: <UserOutlined />,      label: quickAddLabel('Клієнти',    '/clients/new') },
    { key: '/trucks',       module: null,          icon: <CarOutlined />,       label: quickAddLabel('Вантажівки', '/trucks/new') },
    { key: '/orders',       module: null,          icon: <FileTextOutlined />,  label: quickAddLabel('Замовлення', '/orders/new') },
    { key: '/inventory',    module: 'inventory',   icon: <AppstoreOutlined />,  label: quickAddLabel('Склад',      '/inventory/new') },
    { key: '/appointments', module: 'appointments',icon: <CalendarOutlined />,  label: 'Записи' },
    { key: '/bot',          module: 'bot',         icon: <RobotOutlined />,     label: 'Telegram бот' },
    { key: '/reminders',    module: 'maintenance', icon: <BellOutlined />,      label: 'Нагадування ТО' },
    { key: '/maintenance-templates', module: 'maintenance', icon: <ToolOutlined />, label: 'Еталони ТО' },
    { key: '/invoices',     module: 'invoices',    icon: <FileDoneOutlined />,  label: 'Рахунки' },
    { key: '/alpr',         module: 'alpr',        icon: <CameraOutlined />,    label: 'Журнал авто' },
  ];

  const menuItems = ALL_MENU_ITEMS
    .filter(({ module }) => module === null || isEnabled(module))
    .map(({ module: _m, ...item }) => item);

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
      <img src={logoImg} alt="Італ Трак" style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }} />
      {!collapsed && (
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, lineHeight: 1.1, letterSpacing: 0.3 }}>Італ Трак</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5 }}>CRM</div>
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
              <img src={logoImg} alt="Італ Трак" style={{ width: 42, height: 42, objectFit: 'contain' }} />
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 19 }}>Італ Трак</span>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {canInstall && (
            <Tooltip title="Встановити додаток">
              <Button
                type="text"
                icon={<DownloadOutlined />}
                onClick={handleInstallPWA}
                style={{ color: INK, fontSize: 16 }}
              />
            </Tooltip>
          )}
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight" arrow>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 12, padding: '0 8px' }}>
              {!isMobile && (
                <span style={{ fontWeight: 600, fontSize: 14, color: INK }}>{user?.username || 'Користувач'}</span>
              )}
              <Avatar icon={<UserOutlined />} style={{ background: Y, color: INK, fontWeight: 700 }} />
            </div>
          </Dropdown>
          </div>
        </Header>

        {/* Demo banner */}
        {demoBannerVisible && (
          <Alert
            banner
            type="warning"
            message={
              <span>
                <strong>Демо-режим</strong> — дані тестові та не відображають реальну роботу підприємства.
                Зверніться до нас, щоб отримати повну версію системи.
              </span>
            }
            closable
            onClose={() => {
              localStorage.setItem('demo_banner_dismissed', '1');
              setDemoBannerVisible(false);
            }}
            style={{ borderRadius: 0 }}
          />
        )}

        <PWAUpdatePrompt />

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

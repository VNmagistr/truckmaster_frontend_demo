import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, message, Button, Steps, Typography, Modal, List, Checkbox } from 'antd';
import {
  UserOutlined,
  CarOutlined,
  FileTextOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  RobotOutlined,
  PlusOutlined,
  RocketOutlined,
  ToolOutlined,
  BellOutlined,
  SettingOutlined,
  AppstoreOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { ordersAPI, clientsAPI, trucksAPI, botAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatMoney } from '../../utils/formatters';

const Y = '#f5c518';
const INK = '#1a1a1a';

const cardStyle = {
  borderTop: `4px solid ${Y}`,
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  transition: 'box-shadow 0.3s, transform 0.3s',
};

function DashboardPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalTrucks: 0,
    totalOrders: 0,
    openOrders: 0,
    inProgressOrders: 0,
    monthlyRevenue: 0,
    clientsChart: [],
    mileageToday: null,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [clientsRes, trucksRes, ordersRes, dashRes, botStatsRes] = await Promise.all([
        clientsAPI.getAll({ page_size: 1 }),
        trucksAPI.getAll({ page_size: 1 }),
        ordersAPI.getAll({ page_size: 5, ordering: '-created_at' }),
        ordersAPI.getDashboardStats(),
        botAPI.getStatistics().catch(() => null),
      ]);

      const clientsData = clientsRes.data || clientsRes;
      const trucksData = trucksRes.data || trucksRes;
      const ordersData = ordersRes.data || ordersRes;
      const dash = dashRes.data || dashRes;

      setStats({
        totalClients: clientsData.count || 0,
        totalTrucks: trucksData.count || 0,
        totalOrders: dash.total_orders || ordersData.count || 0,
        openOrders: dash.open_orders || 0,
        inProgressOrders: dash.in_progress_orders || 0,
        monthlyRevenue: dash.monthly_revenue || 0,
        clientsChart: dash.clients_chart || [],
        mileageToday: botStatsRes ? (botStatsRes.data?.mileage_today ?? null) : null,
      });

      setRecentOrders((ordersData.results || []).slice(0, 5));
    } catch {
      message.error(t('dashboard.statsError'));
    } finally {
      setLoading(false);
    }
  };


  const recentOrdersColumns = [
    {
      title: t('dashboard.orderNumber'),
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text, record) => (
        <Link to={`/orders/${record.id}`} style={{ color: INK, fontWeight: 600 }}>
          {text || `#${record.id}`}
        </Link>
      ),
    },
    {
      title: t('common.client'),
      dataIndex: ['client', 'name'],
      key: 'client',
      render: (text) => text || '-',
    },
    {
      title: t('common.truck'),
      dataIndex: ['truck', 'license_plate'],
      key: 'truck',
      render: (text) => text || '-',
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (s) => <StatusTag status={s} type="order" />,
    },
    {
      title: t('common.amount'),
      dataIndex: 'total_cost',
      key: 'total_cost',
      align: 'right',
      render: (v) => formatMoney(v),
    },
  ];

  const isFirstRun = !loading && stats.totalClients === 0 && stats.totalOrders === 0;

  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (isFirstRun && localStorage.getItem('setup_wizard_dismissed') !== '1') {
      setSetupModalOpen(true);
    }
  }, [isFirstRun]);

  const handleSetupModalClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('setup_wizard_dismissed', '1');
    }
    setSetupModalOpen(false);
  };

  // Базовий URL адмін-панелі (з VITE_API_URL прибираємо /api суфікс)
  const adminBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '') + '/admin';

  const SETUP_ITEMS = [
    {
      icon: <CarOutlined style={{ color: '#f5c518', fontSize: 20 }} />,
      title: t('dashboard.setupBaseModels'),
      description: t('dashboard.setupBaseModelsDesc'),
      link: { label: t('dashboard.openAdminPanel'), href: `${adminBase}/clients/ivecobasemodel/add/` },
    },
    {
      icon: <AppstoreOutlined style={{ color: '#f5c518', fontSize: 20 }} />,
      title: t('dashboard.setupWorkGroups'),
      description: t('dashboard.setupWorkGroupsDesc'),
      link: { label: t('dashboard.openAdminPanel'), href: `${adminBase}/orders/workgroup/add/` },
    },
    {
      icon: <DollarOutlined style={{ color: '#f5c518', fontSize: 20 }} />,
      title: t('dashboard.setupPriceList'),
      description: t('dashboard.setupPriceListDesc'),
      link: { label: t('dashboard.openAdminPanel'), href: `${adminBase}/orders/workprice/add/` },
    },
    {
      icon: <BellOutlined style={{ color: '#f5c518', fontSize: 20 }} />,
      title: t('dashboard.setupMaintenanceRules'),
      description: t('dashboard.setupMaintenanceRulesDesc'),
      link: { label: t('dashboard.goToReminders'), href: '/reminders', internal: true },
    },
    {
      icon: <SettingOutlined style={{ color: '#f5c518', fontSize: 20 }} />,
      title: t('dashboard.setupMileageIntervals'),
      description: t('dashboard.setupMileageIntervalsDesc'),
      note: t('dashboard.setupMileageIntervalsNote'),
    },
  ];

  if (loading) return <LoadingSpinner />;


  const setupWizardModal = (
    <Modal
      open={setupModalOpen}
      onCancel={handleSetupModalClose}
      onOk={handleSetupModalClose}
      okText={t('dashboard.setupConfirm')}
      cancelText={t('common.later')}
      width={620}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ExclamationCircleOutlined style={{ color: '#f5c518', fontSize: 22 }} />
          <span>{t('dashboard.setupTitle')}</span>
        </div>
      }
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <Checkbox
            checked={dontShowAgain}
            onChange={e => setDontShowAgain(e.target.checked)}
          >
            {t('dashboard.dontShowAgain')}
          </Checkbox>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={handleSetupModalClose}>{t('common.later')}</Button>
            <Button type="primary" onClick={handleSetupModalClose}>{t('dashboard.setupConfirm')}</Button>
          </div>
        </div>
      }
    >
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        {t('dashboard.setupSubtitle')}
      </Typography.Text>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
        {t('dashboard.setupAdminHint')}{' '}
        <a href={adminBase} target="_blank" rel="noopener noreferrer">{t('dashboard.djangoAdmin')}</a>.
      </Typography.Text>
      <List
        dataSource={SETUP_ITEMS}
        renderItem={(item) => (
          <List.Item style={{ alignItems: 'flex-start', gap: 12, padding: '12px 0' }}>
            <div style={{ paddingTop: 2, flexShrink: 0 }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <Typography.Text strong style={{ display: 'block', marginBottom: 2 }}>
                {item.title}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {item.description}
              </Typography.Text>
              {item.note && (
                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4, fontStyle: 'italic' }}>
                  {item.note}
                </Typography.Text>
              )}
              {item.link && (
                <div style={{ marginTop: 6 }}>
                  {item.link.internal ? (
                    <Button
                      size="small"
                      type="link"
                      style={{ padding: 0, height: 'auto', fontSize: 13 }}
                      onClick={() => { handleSetupModalClose(); navigate(item.link.href); }}
                    >
                      {item.link.label} →
                    </Button>
                  ) : (
                    <a
                      href={item.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 13 }}
                    >
                      {item.link.label} →
                    </a>
                  )}
                </div>
              )}
            </div>
          </List.Item>
        )}
      />
    </Modal>
  );

  if (isFirstRun) {
    return (
      <div>
        {setupWizardModal}
        <PageHeader title={t('dashboard.title')} />
        <Card
          style={{
            borderTop: `4px solid ${Y}`,
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            maxWidth: 720,
            margin: '32px auto',
          }}
        >
          <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
            <RocketOutlined style={{ fontSize: 48, color: Y, marginBottom: 12 }} />
            <Typography.Title level={3} style={{ marginBottom: 4 }}>
              {t('dashboard.welcome')}
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 15 }}>
              {t('dashboard.emptyTitle')}
            </Typography.Text>
          </div>
          <Steps
            direction="vertical"
            current={-1}
            style={{ maxWidth: 560, margin: '0 auto' }}
            items={[
              {
                title: <Typography.Text strong>{t('dashboard.step1Title')}</Typography.Text>,
                description: (
                  <div style={{ paddingBottom: 8 }}>
                    <Typography.Text type="secondary">
                      {t('dashboard.step1Desc')}
                    </Typography.Text>
                    <br />
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      style={{ marginTop: 8 }}
                      onClick={() => navigate('/clients/new')}
                    >
                      {t('dashboard.addClient')}
                    </Button>
                  </div>
                ),
                icon: <UserOutlined />,
              },
              {
                title: <Typography.Text strong>{t('dashboard.step2Title')}</Typography.Text>,
                description: (
                  <div style={{ paddingBottom: 8 }}>
                    <Typography.Text type="secondary">
                      {t('dashboard.step2Desc')}
                    </Typography.Text>
                    <br />
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      style={{ marginTop: 8 }}
                      onClick={() => navigate('/trucks/new')}
                    >
                      {t('dashboard.addTruck')}
                    </Button>
                  </div>
                ),
                icon: <CarOutlined />,
              },
              {
                title: <Typography.Text strong>{t('dashboard.step3Title')}</Typography.Text>,
                description: (
                  <div style={{ paddingBottom: 8 }}>
                    <Typography.Text type="secondary">
                      {t('dashboard.step3Desc')}
                    </Typography.Text>
                    <br />
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      style={{ marginTop: 8 }}
                      onClick={() => navigate('/orders/new')}
                    >
                      {t('dashboard.newOrder')}
                    </Button>
                  </div>
                ),
                icon: <FileTextOutlined />,
              },
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      {setupWizardModal}
      <PageHeader title={t('dashboard.title')} />

      {/* Рядок 1: ключові метрики */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={4}>
          <Card hoverable style={cardStyle} onClick={() => navigate('/clients')}>
            <Statistic
              title={t('dashboard.clientsCount')}
              value={stats.totalClients}
              prefix={<UserOutlined />}
              valueStyle={{ color: INK }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card hoverable style={cardStyle} onClick={() => navigate('/trucks')}>
            <Statistic
              title={t('dashboard.trucksCount')}
              value={stats.totalTrucks}
              prefix={<CarOutlined />}
              valueStyle={{ color: INK }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card hoverable style={cardStyle} onClick={() => navigate('/orders')}>
            <Statistic
              title={t('dashboard.totalOrders')}
              value={stats.totalOrders}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: INK }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card style={cardStyle}>
            <Statistic
              title={t('dashboard.openOrders')}
              value={stats.openOrders}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card style={cardStyle}>
            <Statistic
              title={t('dashboard.inProgress')}
              value={stats.inProgressOrders}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card style={cardStyle}>
            <Statistic
              title={t('dashboard.monthRevenue')}
              value={stats.monthlyRevenue}
              prefix={<DollarOutlined />}
              suffix="₴"
              precision={0}
              groupSeparator=" "
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        {stats.mileageToday !== null && (
          <Col xs={12} sm={8} lg={4}>
            <Card style={cardStyle}>
              <Statistic
                title={t('dashboard.botMileageToday')}
                value={stats.mileageToday}
                prefix={<RobotOutlined />}
                suffix={t('dashboard.reports')}
                valueStyle={{ color: INK }}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* Рядок 2: графік клієнтів + останні замовлення */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card
            title={t('dashboard.clients12months')}
            style={cardStyle}
          >
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.clientsChart}>
                  <CartesianGrid stroke="#f5f5f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [v, t('dashboard.clientsLabel')]}
                  />
                  <Bar
                    dataKey="clients"
                    fill={Y}
                    radius={[4, 4, 0, 0]}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={t('dashboard.recentOrders')}
            style={{ ...cardStyle, height: '100%' }}
            extra={<Link to="/orders" style={{ color: Y }}>{t('dashboard.viewAll')}</Link>}
          >
            <Table
              columns={recentOrdersColumns}
              dataSource={recentOrders}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default DashboardPage;


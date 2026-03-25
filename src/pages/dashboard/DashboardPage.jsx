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
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalTrucks: 0,
    totalOrders: 0,
    openOrders: 0,
    inProgressOrders: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    revenueChart: [],
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
        yearlyRevenue: dash.yearly_revenue || 0,
        revenueChart: dash.revenue_chart || [],
        mileageToday: botStatsRes ? (botStatsRes.data?.mileage_today ?? null) : null,
      });

      setRecentOrders((ordersData.results || []).slice(0, 5));
    } catch {
      message.error('Не вдалося завантажити статистику');
    } finally {
      setLoading(false);
    }
  };

  const recentOrdersColumns = [
    {
      title: '№',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text, record) => (
        <Link to={`/orders/${record.id}`} style={{ color: INK, fontWeight: 600 }}>
          {text || `#${record.id}`}
        </Link>
      ),
    },
    {
      title: 'Клієнт',
      dataIndex: ['client', 'name'],
      key: 'client',
      render: (text) => text || '-',
    },
    {
      title: 'Авто',
      dataIndex: ['truck', 'license_plate'],
      key: 'truck',
      render: (text) => text || '-',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <StatusTag status={s} type="order" />,
    },
    {
      title: 'Сума',
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
      title: 'Базові моделі автомобілів',
      description: 'Додайте лінійку Iveco, якою ви працюєте: Daily, S-Way, X-Way, Stralis тощо. Це прискорить створення карток авто.',
      link: { label: 'Відкрити в адмін-панелі', href: `${adminBase}/clients/ivecobasemodel/add/` },
    },
    {
      icon: <AppstoreOutlined style={{ color: '#f5c518', fontSize: 20 }} />,
      title: 'Групи робіт',
      description: 'Створіть категорії: Двигун, Трансмісія, Гальма, Підвіска, Електрика, Планове ТО тощо. Від них залежить структура прайсу.',
      link: { label: 'Відкрити в адмін-панелі', href: `${adminBase}/orders/workgroup/add/` },
    },
    {
      icon: <DollarOutlined style={{ color: '#f5c518', fontSize: 20 }} />,
      title: 'Вартості робіт (прайс-лист)',
      description: 'Для кожної групи додайте позиції: назва роботи, нормо-години, ставка. Ці ціни будуть автоматично підтягуватись у наряди.',
      link: { label: 'Відкрити в адмін-панелі', href: `${adminBase}/orders/workprice/add/` },
    },
    {
      icon: <BellOutlined style={{ color: '#f5c518', fontSize: 20 }} />,
      title: 'Регламенти технічного обслуговування',
      description: 'Налаштуйте правила автоматичних нагадувань: тип роботи, інтервал у кілометрах або днях. Система сама нагадає про ТО.',
      link: { label: 'Перейти до Нагадувань ТО', href: '/reminders', internal: true },
    },
    {
      icon: <SettingOutlined style={{ color: '#f5c518', fontSize: 20 }} />,
      title: 'Інтервали пробігів для вантажівок',
      description: 'Для кожного авто окремо вкажіть пробіги останньої заміни оливи, ремені, ланцюги. Це дозволить системі відстежувати знос деталей.',
      note: 'Налаштовується на сторінці кожного автомобіля після його додавання.',
    },
  ];

  if (loading) return <LoadingSpinner />;

  const setupWizardModal = (
    <Modal
      open={setupModalOpen}
      onCancel={handleSetupModalClose}
      onOk={handleSetupModalClose}
      okText="Зрозуміло, налаштую"
      cancelText="Пізніше"
      width={620}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ExclamationCircleOutlined style={{ color: '#f5c518', fontSize: 22 }} />
          <span>Рекомендації перед початком роботи</span>
        </div>
      }
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <Checkbox
            checked={dontShowAgain}
            onChange={e => setDontShowAgain(e.target.checked)}
          >
            Не показувати більше
          </Checkbox>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={handleSetupModalClose}>Пізніше</Button>
            <Button type="primary" onClick={handleSetupModalClose}>Зрозуміло, налаштую</Button>
          </div>
        </div>
      }
    >
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Система готова до роботи, але рекомендуємо заповнити базові довідники — це займе 10–15 хвилин і значно прискорить щоденну роботу.
      </Typography.Text>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
        Будь-які подальші доналаштування — довідники, користувачі, модулі, права доступу — доступні через{' '}
        <a href={adminBase} target="_blank" rel="noopener noreferrer">адмін-панель Django</a>.
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
        <PageHeader title="Дашборд" />
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
              Ласкаво просимо до TruckMaster CRM
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 15 }}>
              Система порожня. Почніть з трьох простих кроків:
            </Typography.Text>
          </div>
          <Steps
            direction="vertical"
            current={-1}
            style={{ maxWidth: 560, margin: '0 auto' }}
            items={[
              {
                title: <Typography.Text strong>Додайте першого клієнта</Typography.Text>,
                description: (
                  <div style={{ paddingBottom: 8 }}>
                    <Typography.Text type="secondary">
                      Клієнт — власник вантажівки. Вкажіть ім&apos;я, телефон та місто.
                    </Typography.Text>
                    <br />
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      style={{ marginTop: 8 }}
                      onClick={() => navigate('/clients/new')}
                    >
                      Додати клієнта
                    </Button>
                  </div>
                ),
                icon: <UserOutlined />,
              },
              {
                title: <Typography.Text strong>Додайте вантажівку</Typography.Text>,
                description: (
                  <div style={{ paddingBottom: 8 }}>
                    <Typography.Text type="secondary">
                      Прив&apos;яжіть авто до клієнта: модель, номерний знак, VIN.
                    </Typography.Text>
                    <br />
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      style={{ marginTop: 8 }}
                      onClick={() => navigate('/trucks/new')}
                    >
                      Додати авто
                    </Button>
                  </div>
                ),
                icon: <CarOutlined />,
              },
              {
                title: <Typography.Text strong>Створіть перший наряд-замовлення</Typography.Text>,
                description: (
                  <div style={{ paddingBottom: 8 }}>
                    <Typography.Text type="secondary">
                      Оформіть ремонт або ТО: оберіть авто, опишіть проблему, додайте роботи.
                    </Typography.Text>
                    <br />
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      style={{ marginTop: 8 }}
                      onClick={() => navigate('/orders/new')}
                    >
                      Нове замовлення
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
      <PageHeader title="Дашборд" />

      {/* Рядок 1: ключові метрики */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={4}>
          <Card hoverable style={cardStyle} onClick={() => navigate('/clients')}>
            <Statistic
              title="Клієнтів"
              value={stats.totalClients}
              prefix={<UserOutlined />}
              valueStyle={{ color: INK }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card hoverable style={cardStyle} onClick={() => navigate('/trucks')}>
            <Statistic
              title="Вантажівок"
              value={stats.totalTrucks}
              prefix={<CarOutlined />}
              valueStyle={{ color: INK }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card hoverable style={cardStyle} onClick={() => navigate('/orders')}>
            <Statistic
              title="Всього замовлень"
              value={stats.totalOrders}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: INK }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card style={cardStyle}>
            <Statistic
              title="Відкрито"
              value={stats.openOrders}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card style={cardStyle}>
            <Statistic
              title="В роботі"
              value={stats.inProgressOrders}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card style={cardStyle}>
            <Statistic
              title="Виторг (місяць)"
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
                title="Пробіг через бота (сьогодні)"
                value={stats.mileageToday}
                prefix={<RobotOutlined />}
                suffix="звітів"
                valueStyle={{ color: INK }}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* Рядок 2: графік виторгу + останні замовлення */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card
            title="Виторг за останні 12 місяців"
            style={cardStyle}
            extra={
              <span style={{ color: '#3f8600', fontWeight: 600 }}>
                {stats.yearlyRevenue.toLocaleString('uk-UA')} ₴ / рік
              </span>
            }
          >
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenueChart}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={Y} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={Y} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f5f5f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v) => [`${v.toLocaleString('uk-UA')} ₴`, 'Виторг']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={Y}
                    strokeWidth={2}
                    fill="url(#revenueGrad)"
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title="Останні замовлення"
            style={{ ...cardStyle, height: '100%' }}
            extra={<Link to="/orders" style={{ color: Y }}>Всі</Link>}
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


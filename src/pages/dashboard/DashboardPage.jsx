import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Table, message, Button, Steps, Typography, Modal, List, Checkbox } from 'antd';
import {
  UserOutlined,
  CarOutlined,
  FileTextOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  RobotOutlined,
  PlusOutlined,
  RocketOutlined,
  BellOutlined,
  SettingOutlined,
  AppstoreOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, AreaChart, Area,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { ordersAPI, clientsAPI, trucksAPI, botAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatMoney } from '../../utils/formatters';

const Y = '#f5c518';
const INK = '#1a1a1a';
const MUTED = '#8c8c8c';
const DANGER = '#f5222d';
const SUCCESS = '#52c41a';
const INFO = '#1890ff';

function KpiCard({
  icon,
  title,
  value,
  suffix,
  valueColor = INK,
  trend,
  trendLabel,
  sparkline,
  sparklineColor = Y,
  sparklineType = 'bar',
  onClick,
  actionLabel,
  tone = 'default',
}) {
  const toneClass = tone === 'warning' ? 'kpi-card kpi-card--warning'
    : tone === 'info' ? 'kpi-card kpi-card--info'
    : 'kpi-card';

  const trendIcon = trend == null ? null
    : trend > 0 ? <ArrowUpOutlined style={{ color: SUCCESS, fontSize: 12 }} />
    : trend < 0 ? <ArrowDownOutlined style={{ color: DANGER, fontSize: 12 }} />
    : <ArrowRightOutlined style={{ color: MUTED, fontSize: 12 }} />;

  const trendColor = trend == null ? MUTED
    : trend > 0 ? SUCCESS
    : trend < 0 ? DANGER
    : MUTED;

  return (
    <div className={toneClass} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : -1}>
      <div className="kpi-card__header">
        <div className="kpi-card__icon">{icon}</div>
        <div className="kpi-card__title">{title}</div>
      </div>
      <div className="kpi-card__value" style={{ color: valueColor }}>
        {value}
        {suffix && <span className="kpi-card__suffix">{suffix}</span>}
      </div>

      {(trend != null || trendLabel) && (
        <div className="kpi-card__trend" style={{ color: trendColor }}>
          {trendIcon}
          <span>
            {trend != null && (
              <strong>
                {trend > 0 ? '+' : ''}
                {Math.abs(trend) >= 1 ? trend.toFixed(0) : trend.toFixed(1)}
                {typeof trend === 'number' && trendLabel ? '% ' : ' '}
              </strong>
            )}
            <span style={{ color: MUTED, fontWeight: 400 }}>{trendLabel}</span>
          </span>
        </div>
      )}

      {sparkline && sparkline.length > 0 && (
        <div className="kpi-card__spark">
          <ResponsiveContainer width="100%" height={36}>
            {sparklineType === 'bar' ? (
              <BarChart data={sparkline} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <Bar dataKey="value" fill={sparklineColor} radius={[2, 2, 0, 0]} />
                <Tooltip
                  cursor={{ fill: 'rgba(245,197,24,0.1)' }}
                  contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 4 }}
                  formatter={(v) => [v, '']}
                  labelStyle={{ fontSize: 11 }}
                />
              </BarChart>
            ) : (
              <AreaChart data={sparkline} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`spark-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={sparklineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={sparklineColor}
                  strokeWidth={2}
                  fill={`url(#spark-${title})`}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 4 }}
                  formatter={(v) => [v, '']}
                  labelStyle={{ fontSize: 11 }}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {actionLabel && (
        <div className="kpi-card__action">
          {actionLabel} <ArrowRightOutlined style={{ fontSize: 11 }} />
        </div>
      )}
    </div>
  );
}

function computeTrend(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function DashboardPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
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
        totalClients: dash.clients_total || clientsData.count || 0,
        totalTrucks: dash.trucks_total || trucksData.count || 0,
        totalOrders: dash.total_orders || ordersData.count || 0,
        openOrders: dash.open_orders || 0,
        inProgressOrders: dash.in_progress_orders || 0,
        activeOrders: dash.active_orders || 0,
        staleOrders: dash.stale_orders || 0,
        maintenanceDue: dash.maintenance_due || 0,
        clientsAddedWeek: dash.clients_added_week || 0,
        monthlyOrders: dash.monthly_orders || 0,
        prevMonthlyOrders: dash.prev_monthly_orders || 0,
        monthlyRevenue: dash.monthly_revenue || 0,
        prevMonthlyRevenue: dash.prev_monthly_revenue || 0,
        clientsChart: dash.clients_chart || [],
        revenueTrend: dash.revenue_trend || [],
        ordersTrendDays: dash.orders_trend_days || [],
        ordersTrendMonths: dash.orders_trend_months || [],
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

  const isFirstRun = !loading && stats && stats.totalClients === 0 && stats.totalOrders === 0;

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

  const adminBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '') + '/admin';

  const SETUP_ITEMS = useMemo(() => [
    {
      icon: <CarOutlined style={{ color: Y, fontSize: 20 }} />,
      title: t('dashboard.setupBaseModels'),
      description: t('dashboard.setupBaseModelsDesc'),
      link: { label: t('dashboard.openAdminPanel'), href: `${adminBase}/clients/ivecobasemodel/add/` },
    },
    {
      icon: <AppstoreOutlined style={{ color: Y, fontSize: 20 }} />,
      title: t('dashboard.setupWorkGroups'),
      description: t('dashboard.setupWorkGroupsDesc'),
      link: { label: t('dashboard.openAdminPanel'), href: `${adminBase}/orders/workgroup/add/` },
    },
    {
      icon: <DollarOutlined style={{ color: Y, fontSize: 20 }} />,
      title: t('dashboard.setupWorkPrices'),
      description: t('dashboard.setupWorkPricesDesc'),
      link: { label: t('dashboard.openAdminPanel'), href: `${adminBase}/orders/workprice/add/` },
    },
    {
      icon: <BellOutlined style={{ color: Y, fontSize: 20 }} />,
      title: t('dashboard.setupMaintenance'),
      description: t('dashboard.setupMaintenanceDesc'),
      link: { label: t('dashboard.goToReminders'), href: '/reminders', internal: true },
    },
    {
      icon: <SettingOutlined style={{ color: Y, fontSize: 20 }} />,
      title: t('dashboard.setupIntervals'),
      description: t('dashboard.setupIntervalsDesc'),
      note: t('dashboard.setupIntervalsHint'),
    },
  ], [adminBase, t]);

  if (loading || !stats) return <LoadingSpinner />;

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
          <ExclamationCircleOutlined style={{ color: Y, fontSize: 22 }} />
          <span>{t('dashboard.setupTitle')}</span>
        </div>
      }
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <Checkbox checked={dontShowAgain} onChange={e => setDontShowAgain(e.target.checked)}>
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
                      size="small" type="link"
                      style={{ padding: 0, height: 'auto', fontSize: 13 }}
                      onClick={() => { handleSetupModalClose(); navigate(item.link.href); }}
                    >
                      {item.link.label} →
                    </Button>
                  ) : (
                    <a href={item.link.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
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
                    <Typography.Text type="secondary">{t('dashboard.step1Desc')}</Typography.Text>
                    <br />
                    <Button type="primary" size="small" icon={<PlusOutlined />} style={{ marginTop: 8 }} onClick={() => navigate('/clients/new')}>
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
                    <Typography.Text type="secondary">{t('dashboard.step2Desc')}</Typography.Text>
                    <br />
                    <Button size="small" icon={<PlusOutlined />} style={{ marginTop: 8 }} onClick={() => navigate('/trucks/new')}>
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
                    <Typography.Text type="secondary">{t('dashboard.step3Desc')}</Typography.Text>
                    <br />
                    <Button size="small" icon={<PlusOutlined />} style={{ marginTop: 8 }} onClick={() => navigate('/orders/new')}>
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

  const revenueTrend = computeTrend(stats.monthlyRevenue, stats.prevMonthlyRevenue);
  const ordersTrend = computeTrend(stats.monthlyOrders, stats.prevMonthlyOrders);

  return (
    <div className="dashboard-v2">
      {setupWizardModal}
      <PageHeader title={t('dashboard.title')} />

      <div className="kpi-grid">
        <KpiCard
          icon={<ToolOutlined />}
          title={t('dashboard.activeOrders')}
          value={stats.activeOrders}
          valueColor={INK}
          trendLabel={t('dashboard.activeOrdersHint')}
          sparkline={stats.ordersTrendDays}
          sparklineColor={Y}
          sparklineType="bar"
          onClick={() => navigate('/orders')}
          actionLabel={t('dashboard.toList')}
        />

        <KpiCard
          icon={<FileTextOutlined />}
          title={t('dashboard.monthOrders')}
          value={stats.monthlyOrders}
          valueColor={INK}
          trend={ordersTrend}
          trendLabel={t('dashboard.sinceLastMonth')}
          sparkline={stats.ordersTrendMonths}
          sparklineColor={INFO}
          sparklineType="area"
          onClick={() => navigate('/orders')}
          actionLabel={t('dashboard.toList')}
        />

        <KpiCard
          icon={<DollarOutlined />}
          title={t('dashboard.monthRevenue')}
          value={Number(stats.monthlyRevenue).toLocaleString('uk-UA', { maximumFractionDigits: 0 })}
          suffix="₴"
          valueColor={SUCCESS}
          trend={revenueTrend}
          trendLabel={t('dashboard.sinceLastMonth')}
          sparkline={stats.revenueTrend}
          sparklineColor={SUCCESS}
          sparklineType="area"
          onClick={() => navigate('/reports')}
          actionLabel={t('dashboard.openReport')}
        />

        <KpiCard
          icon={<WarningOutlined />}
          title={t('dashboard.staleOrders')}
          value={stats.staleOrders}
          valueColor={stats.staleOrders > 0 ? DANGER : INK}
          trendLabel={t('dashboard.staleOrdersHint')}
          onClick={() => navigate('/orders')}
          actionLabel={stats.staleOrders > 0 ? t('dashboard.needsAttention') : t('dashboard.toList')}
          tone={stats.staleOrders > 0 ? 'warning' : 'default'}
        />

        <KpiCard
          icon={<ClockCircleOutlined />}
          title={t('dashboard.maintenanceDue')}
          value={stats.maintenanceDue}
          valueColor={stats.maintenanceDue > 0 ? '#faad14' : INK}
          trendLabel={t('dashboard.maintenanceDueHint')}
          onClick={() => navigate('/reminders')}
          actionLabel={t('dashboard.toList')}
          tone={stats.maintenanceDue > 0 ? 'info' : 'default'}
        />

        <KpiCard
          icon={<UserOutlined />}
          title={t('dashboard.clientsCount')}
          value={stats.totalClients}
          valueColor={INK}
          trend={stats.clientsAddedWeek > 0 ? stats.clientsAddedWeek : null}
          trendLabel={
            stats.clientsAddedWeek > 0 ? t('dashboard.newThisWeek') : t('dashboard.clientsHint')
          }
          onClick={() => navigate('/clients')}
          actionLabel={t('dashboard.toList')}
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title={t('dashboard.clients12months')} className="dashboard-chart-card">
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.clientsChart}>
                  <CartesianGrid stroke="#f5f5f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, t('dashboard.clientsLabel')]} />
                  <Bar dataKey="clients" fill={Y} radius={[4, 4, 0, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={t('dashboard.recentOrders')}
            className="dashboard-chart-card"
            style={{ height: '100%' }}
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

      {stats.mileageToday !== null && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <div className="kpi-card kpi-card--compact">
              <div className="kpi-card__header">
                <div className="kpi-card__icon"><RobotOutlined /></div>
                <div className="kpi-card__title">{t('dashboard.botMileageToday')}</div>
              </div>
              <div className="kpi-card__value" style={{ color: INK }}>
                {stats.mileageToday}
                <span className="kpi-card__suffix">{t('dashboard.reports')}</span>
              </div>
            </div>
          </Col>
        </Row>
      )}
    </div>
  );
}

export default DashboardPage;

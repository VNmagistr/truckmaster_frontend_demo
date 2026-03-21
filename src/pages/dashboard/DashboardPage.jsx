import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, message } from 'antd';
import {
  UserOutlined,
  CarOutlined,
  FileTextOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { ordersAPI, clientsAPI, trucksAPI } from '../../api';
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
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [clientsRes, trucksRes, ordersRes, dashRes] = await Promise.all([
        clientsAPI.getAll({ page_size: 1 }),
        trucksAPI.getAll({ page_size: 1 }),
        ordersAPI.getAll({ page_size: 5, ordering: '-created_at' }),
        ordersAPI.getDashboardStats(),
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

  if (loading) return <LoadingSpinner />;

  return (
    <div>
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


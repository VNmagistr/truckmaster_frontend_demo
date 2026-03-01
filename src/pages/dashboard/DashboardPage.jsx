import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, message } from 'antd';
import {
  UserOutlined,
  CarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ordersAPI, clientsAPI, trucksAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatMoney } from '../../utils/formatters';

function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalTrucks: 0,
    totalOrders: 0,
    openOrders: 0,
    inProgressOrders: 0,
    monthlyRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [chartData, setChartData] = useState([]);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [clientsResponse, trucksResponse, ordersResponse, dashStatsResponse, weekDetailResponse] = await Promise.all([
        clientsAPI.getAll({ page_size: 1 }),
        trucksAPI.getAll({ page_size: 1 }),
        ordersAPI.getAll({ page_size: 5, ordering: '-created_at' }),
        ordersAPI.getDashboardStats(),
        ordersAPI.getWeekDetail(),
      ]);

      const clientsData = clientsResponse.data || clientsResponse;
      const trucksData = trucksResponse.data || trucksResponse;
      const ordersData = ordersResponse.data || ordersResponse;
      const dashStats = dashStatsResponse.data || dashStatsResponse;
      const weekData = weekDetailResponse.data || weekDetailResponse;

      const ordersList = ordersData.results || [];

      setStats({
        totalClients: clientsData.count || 0,
        totalTrucks: trucksData.count || 0,
        totalOrders: ordersData.count || 0,
        openOrders: dashStats.open_orders || 0,
        inProgressOrders: dashStats.in_progress_orders || 0,
        monthlyRevenue: 0,
      });

      setRecentOrders(ordersList.slice(0, 5));
      setChartData(Array.isArray(weekData) ? weekData : []);

    } catch (error) {
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
      render: (text, record) => <Link to={`/orders/${record.id}`}>{text || `#${record.id}`}</Link>,
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
      render: (status) => <StatusTag status={status} type="order" />,
    },
    {
      title: 'Сума',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => formatMoney(amount),
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Дашборд" />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card hoverable onClick={() => navigate('/clients')} style={{ cursor: 'pointer' }}>
            <Statistic title="Клієнтів" value={stats.totalClients} prefix={<UserOutlined />} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card hoverable onClick={() => navigate('/trucks')} style={{ cursor: 'pointer' }}>
            <Statistic title="Вантажівки" value={stats.totalTrucks} prefix={<CarOutlined />} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card hoverable onClick={() => navigate('/orders')} style={{ cursor: 'pointer' }}>
            <Statistic title="Всього замовлень" value={stats.totalOrders} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="Замовлення за поточний тиждень">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="#1890ff" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card title="Останні замовлення" extra={<Link to="/orders">Всі</Link>}>
            <Table
              columns={recentOrdersColumns}
              dataSource={recentOrders}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default DashboardPage;
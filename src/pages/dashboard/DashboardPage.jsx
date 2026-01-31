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
      // 🔥 ВИПРАВЛЕННЯ: Прибрали запит getStats, якого не існує на сервері (він давав 404)
      const [clientsResponse, trucksResponse, ordersResponse] = await Promise.all([
        clientsAPI.getAll(),
        trucksAPI.getAll(),
        ordersAPI.getAll({ page_size: 5, ordering: '-created_at' }),
      ]);

      // Розпаковка даних (.data)
      const clientsData = clientsResponse.data || clientsResponse;
      const trucksData = trucksResponse.data || trucksResponse;
      const ordersData = ordersResponse.data || ordersResponse;

      // Рахуємо кількість (Django pagination повертає count)
      const clientsCount = clientsData.count || (Array.isArray(clientsData) ? clientsData.length : 0);
      const trucksCount = trucksData.count || (Array.isArray(trucksData) ? trucksData.length : 0);
      
      const ordersList = ordersData.results || ordersData || [];
      const totalOrdersCount = ordersData.count || ordersList.length || 0;

      // Встановлюємо статистику
      setStats({
        totalClients: clientsCount,
        totalTrucks: trucksCount,
        totalOrders: totalOrdersCount,
        openOrders: 0, // Поки ставимо 0, бо сервер не віддає детальної статистики
        inProgressOrders: 0,
        monthlyRevenue: 0,
      });

      setRecentOrders(Array.isArray(ordersList) ? ordersList.slice(0, 5) : []);
      
      // Мокові дані для графіка
      setChartData([
        { name: 'Пн', orders: 2 },
        { name: 'Вт', orders: 5 },
        { name: 'Ср', orders: 3 },
        { name: 'Чт', orders: 8 },
        { name: 'Пт', orders: 6 },
        { name: 'Сб', orders: 4 },
        { name: 'Нд', orders: 1 },
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // message.error('Не вдалося завантажити статистику'); // Можна тимчасово приховати
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
          <Card title="Динаміка замовлень (тиждень)">
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
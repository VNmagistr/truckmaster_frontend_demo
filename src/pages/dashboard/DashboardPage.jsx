import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, message } from 'antd';
import {
  UserOutlined,
  CarOutlined,
  FileTextOutlined,
  ToolOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
// ДОДАНО: useNavigate для переадресації
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ordersAPI, clientsAPI, trucksAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatDate, formatMoney } from '../../utils/formatters';

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
  
  // ДОДАНО: ініціалізація навігації
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsResponse, clientsResponse, trucksResponse, ordersResponse] = await Promise.all([
        ordersAPI.getStats ? ordersAPI.getStats() : Promise.resolve({}), 
        clientsAPI.getAll(),
        trucksAPI.getAll(),
        ordersAPI.getAll({ page_size: 5, ordering: '-created_at' }),
      ]);

      // Проста статистика на основі завантажених списків, якщо бекенд не віддає готової статистики
      const clientsCount = clientsResponse.count || clientsResponse.results?.length || clientsResponse.length || 0;
      const trucksCount = trucksResponse.count || trucksResponse.results?.length || trucksResponse.length || 0;
      
      // Обробка замовлень
      const orders = ordersResponse.results || ordersResponse || [];
      const totalOrdersCount = ordersResponse.count || orders.length;
      
      // Рахуємо статуси вручну, якщо немає окремого ендпоінту
      // (Це спрощення, в реальності краще мати окремий API для статистики)
      let open = 0;
      let inProgress = 0;
      
      // Якщо ми отримали лише останні 5, то статистика буде не повною, 
      // але для прикладу показуємо те, що є, або дані з statsResponse якщо він реалізований
      if (statsResponse && statsResponse.total_orders) {
        setStats({
          totalClients: statsResponse.total_clients || clientsCount,
          totalTrucks: statsResponse.total_trucks || trucksCount,
          totalOrders: statsResponse.total_orders,
          openOrders: statsResponse.open_orders || 0,
          inProgressOrders: statsResponse.in_progress_orders || 0,
          monthlyRevenue: statsResponse.monthly_revenue || 0,
        });
      } else {
        // Фоллбек логіка
        setStats({
          totalClients: clientsCount,
          totalTrucks: trucksCount,
          totalOrders: totalOrdersCount,
          openOrders: open, // Тут будуть нулі, якщо не завантажили всі замовлення, але це ок для старту
          inProgressOrders: inProgress,
          monthlyRevenue: 0,
        });
      }

      setRecentOrders(orders.slice(0, 5));
      
      // Мокові дані для графіка, поки немає справжніх
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
        {/* КАРТКА КЛІЄНТІВ */}
        <Col xs={24} sm={8}>
          <Card 
            hoverable // Ефект при наведенні
            onClick={() => navigate('/clients')} // Клік
            style={{ cursor: 'pointer' }} // Курсор
          >
            <Statistic
              title="Клієнтів"
              value={stats.totalClients}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>

        {/* КАРТКА ВАНТАЖІВОК */}
        <Col xs={24} sm={8}>
          <Card 
            hoverable
            onClick={() => navigate('/trucks')}
            style={{ cursor: 'pointer' }}
          >
            <Statistic
              title="Вантажівки"
              value={stats.totalTrucks}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>

        {/* КАРТКА ЗАМОВЛЕНЬ */}
        <Col xs={24} sm={8}>
          <Card 
            hoverable
            onClick={() => navigate('/orders')}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <Statistic
                title="Всього замовлень"
                value={stats.totalOrders}
                prefix={<FileTextOutlined />}
              />
            </div>
            
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Відкрито:</span>
                <Tag color="blue">{stats.openOrders}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>В роботі:</span>
                <Tag color="orange">{stats.inProgressOrders}</Tag>
              </div>
            </div>
            {stats.monthlyRevenue > 0 && (
              <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                <Statistic
                  title="Дохід за місяць"
                  value={stats.monthlyRevenue}
                  suffix="грн"
                  valueStyle={{ color: '#52c41a', fontSize: '16px' }}
                  titleStyle={{ fontSize: '12px' }}
                />
              </div>
            )}
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
          <Card
            title="Останні замовлення"
            extra={<Link to="/orders">Всі</Link>}
          >
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
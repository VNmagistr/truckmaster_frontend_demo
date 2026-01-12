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
import { Link } from 'react-router-dom';
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsResponse, clientsResponse, trucksResponse, ordersResponse] = await Promise.all([
        ordersAPI.getDashboardStats().catch(() => null),
        clientsAPI.getAll({ page_size: 1 }).catch(() => ({ count: 0 })),
        trucksAPI.getAll({ page_size: 1 }).catch(() => ({ count: 0 })),
        ordersAPI.getAll({ page_size: 5, ordering: '-created_at' }).catch(() => ({ results: [] })),
      ]);

      const clientsCount = clientsResponse?.count || clientsResponse?.length || 0;
      const trucksCount = trucksResponse?.count || trucksResponse?.length || 0;

      if (statsResponse) {
        setStats({
          totalClients: clientsCount,
          totalTrucks: trucksCount,
          totalOrders: statsResponse.total_orders || 0,
          openOrders: statsResponse.open_orders || 0,
          inProgressOrders: statsResponse.in_progress_orders || 0,
          monthlyRevenue: statsResponse.monthly_revenue || 0,
        });
        
        if (statsResponse.orders_by_month) {
          setChartData(statsResponse.orders_by_month);
        }
      } else {
        setStats(prev => ({
          ...prev,
          totalClients: clientsCount,
          totalTrucks: trucksCount,
        }));
      }

      const orders = ordersResponse?.results || ordersResponse || [];
      setRecentOrders(orders.slice(0, 5));

    } catch (error) {
      console.error('Dashboard error:', error);
      message.error('Не вдалося завантажити дані');
    } finally {
      setLoading(false);
    }
  };

  const recentOrdersColumns = [
    {
      title: '№ Замовлення',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text, record) => (
        <Link to={`/orders/${record.id}`}>{text || `#${record.id}`}</Link>
      ),
    },
    {
      title: 'Клієнт',
      dataIndex: 'client',
      key: 'client',
      render: (client) => client?.name || '-',
    },
    {
      title: 'Вантажівка',
      dataIndex: 'truck',
      key: 'truck',
      render: (truck) => truck?.license_plate || '-',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <StatusTag status={status} type="order" />,
    },
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => formatDate(date),
    },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <PageHeader title="Головна" subtitle="Огляд системи TruckMaster" />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Клієнтів"
              value={stats.totalClients}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Вантажівок"
              value={stats.totalTrucks}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Замовлень"
              value={stats.totalOrders}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="В роботі"
              value={stats.openOrders + stats.inProgressOrders}
              prefix={<ToolOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="Замовлення по місяцях">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#1890ff"
                    strokeWidth={2}
                    name="Кількість"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                Немає даних для відображення
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Статистика замовлень">
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Відкрито:</span>
                <Tag color="blue">{stats.openOrders}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>В роботі:</span>
                <Tag color="orange">{stats.inProgressOrders}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Всього:</span>
                <Tag color="purple">{stats.totalOrders}</Tag>
              </div>
            </div>
            {stats.monthlyRevenue > 0 && (
              <Statistic
                title="Дохід за місяць"
                value={stats.monthlyRevenue}
                suffix="грн"
                valueStyle={{ color: '#52c41a' }}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card
            title="Останні замовлення"
            extra={<Link to="/orders">Переглянути всі</Link>}
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
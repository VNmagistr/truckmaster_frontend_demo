import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Space, Table, Tag, message, Tabs } from 'antd';
import { EditOutlined, CarOutlined, FileTextOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { clientsAPI, trucksAPI, ordersAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatPhone, formatDate } from '../../utils/formatters';

function ClientDetailPage() {
  const [client, setClient] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      // Отримуємо відповіді від сервера
      const [clientResponse, trucksResponse, ordersResponse] = await Promise.all([
        clientsAPI.getById(id),
        trucksAPI.getByClient(id).catch(() => ({ data: [] })),
        ordersAPI.getAll({ client: id }).catch(() => ({ data: [] })),
      ]);

      // 🔥 ВИПРАВЛЕННЯ: Розпаковуємо дані з .data
      const clientData = clientResponse.data || clientResponse;
      const trucksData = trucksResponse.data || trucksResponse;
      const ordersData = ordersResponse.data || ordersResponse;

      setClient(clientData);
      setTrucks(trucksData.results || trucksData || []);

      const allOrders = ordersData.results || ordersData || [];
      const filteredOrders = allOrders.filter(order => {
        const orderClientId = order.client?.id || order.client;
        return String(orderClientId) === String(id);
      });
      
      setOrders(filteredOrders);

    } catch (error) {
      console.error('Error fetching client:', error);
      message.error('Не вдалося завантажити дані клієнта');
      // Ось чому тебе перекидало на список з помилкою:
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  // ... (решта коду колонок і рендеру без змін) ...
  // Щоб не дублювати весь файл, просто встав цю функцію fetchClientData замість старої.
  
  // Або якщо тобі потрібен повний файл, скажи, я надам.
  // Але нижче код колонок, який треба залишити:

  const trucksColumns = [
    {
      title: 'Номерний знак',
      dataIndex: 'license_plate',
      key: 'license_plate',
      render: (text, record) => (
        <Link to={`/trucks/${record.id}`}>{text}</Link>
      ),
    },
    {
      title: 'Модель',
      dataIndex: 'specific_model_name',
      key: 'model',
    },
    {
      title: 'VIN',
      dataIndex: 'last_seven_vin',
      key: 'vin',
      render: (vin) => `...${vin}`,
    },
    {
      title: 'Євростандарт',
      dataIndex: 'euro_standard',
      key: 'euro',
      render: (euro) => euro ? <Tag>{euro}</Tag> : '-',
    },
  ];

  const ordersColumns = [
    {
      title: '№ Замовлення',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text, record) => (
        <Link to={`/orders/${record.id}`}>{text || `#${record.id}`}</Link>
      ),
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
      key: 'date',
      render: (date) => formatDate(date),
    },
  ];

  if (loading) return <LoadingSpinner />;
  if (!client) return null;

  const tabItems = [
    {
      key: 'trucks',
      label: (<span><CarOutlined /> Вантажівки ({trucks.length})</span>),
      children: (
        <Table
          columns={trucksColumns}
          dataSource={trucks}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'Немає вантажівок' }}
        />
      ),
    },
    {
      key: 'orders',
      label: (<span><FileTextOutlined /> Замовлення ({orders.length})</span>),
      children: (
        <Table
          columns={ordersColumns}
          dataSource={orders}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Немає замовлень' }}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={client.name}
        showBack
        extra={
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/clients/${id}/edit`)}
          >
            Редагувати
          </Button>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="Телефон">
            {formatPhone(client.phone)}
          </Descriptions.Item>
          <Descriptions.Item label="Email">
            {client.email || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Telegram">
            {client.telegram_chat_id ? (
              <Tag color="blue">Підключено</Tag>
            ) : (
              <Tag>Не підключено</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Адреса" span={3}>
            {client.address || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}

export default ClientDetailPage;
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
      // Запитуємо дані. Навіть якщо ordersAPI поверне всі замовлення, ми їх відфільтруємо нижче.
      const [clientData, trucksData, ordersData] = await Promise.all([
        clientsAPI.getById(id),
        trucksAPI.getByClient(id).catch(() => ({ results: [] })),
        ordersAPI.getAll({ client: id }).catch(() => ({ results: [] })),
      ]);

      setClient(clientData);
      setTrucks(trucksData.results || trucksData || []);

      // --- ВИПРАВЛЕННЯ ТУТ ---
      // Фільтруємо замовлення на стороні клієнта, щоб прибрати чужі
      const allOrders = ordersData.results || ordersData || [];
      const filteredOrders = allOrders.filter(order => {
        // Перевіряємо, в якому форматі прийшов клієнт (як об'єкт з ID або просто число)
        const orderClientId = order.client?.id || order.client;
        return String(orderClientId) === String(id);
      });
      
      setOrders(filteredOrders);
      // ----------------------

    } catch (error) {
      console.error('Error fetching client:', error);
      message.error('Не вдалося завантажити дані клієнта');
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!client) {
    return null;
  }

  const tabItems = [
    {
      key: 'trucks',
      label: (
        <span>
          <CarOutlined />
          Вантажівки ({trucks.length})
        </span>
      ),
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
      label: (
        <span>
          <FileTextOutlined />
          Замовлення ({orders.length})
        </span>
      ),
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
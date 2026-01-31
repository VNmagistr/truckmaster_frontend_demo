import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Space, Table, Tag, message, Tabs } from 'antd';
import { EditOutlined, CarOutlined, FileTextOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { clientsAPI, trucksAPI, ordersAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatPhone, formatDate, formatMoney } from '../../utils/formatters';

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
      // Запитуємо дані паралельно
      const [clientResponse, trucksResponse, ordersResponse] = await Promise.all([
        clientsAPI.getById(id),
        trucksAPI.getByClient(id).catch(() => ({ data: [] })),
        ordersAPI.getAll({ client: id }).catch(() => ({ data: [] })),
      ]);

      // 🔥 ВИПРАВЛЕННЯ: "Розпаковуємо" дані (.data)
      const clientData = clientResponse.data || clientResponse;
      const trucksData = trucksResponse.data || trucksResponse;
      const ordersData = ordersResponse.data || ordersResponse;

      setClient(clientData);
      // Враховуємо пагінацію (results) або звичайний масив
      setTrucks(trucksData.results || trucksData || []);
      setOrders(ordersData.results || ordersData || []);

    } catch (error) {
      console.error('Error fetching client details:', error);
      message.error('Не вдалося завантажити дані клієнта');
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!client) return null;

  // ... (Решта коду колонок таблиць залишається без змін)
  const trucksColumns = [
    { title: 'Марка', dataIndex: 'brand', key: 'brand' },
    { title: 'Номерний знак', dataIndex: 'license_plate', key: 'license_plate' },
    { title: 'VIN', dataIndex: 'vin_code', key: 'vin_code' },
    { title: 'Рік', dataIndex: 'year', key: 'year' },
  ];

  const ordersColumns = [
    { 
      title: 'Номер', 
      dataIndex: 'order_number', 
      key: 'order_number',
      render: (text, record) => <Link to={`/orders/${record.id}`}>#{text || record.id}</Link>
    },
    { 
      title: 'Дата', 
      dataIndex: 'created_at', 
      key: 'created_at',
      render: (date) => formatDate(date)
    },
    { 
      title: 'Статус', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => <StatusTag status={status} type="order" />
    },
    { 
      title: 'Сума', 
      dataIndex: 'total_amount', 
      key: 'total_amount',
      render: (amount) => formatMoney(amount)
    },
  ];

  const items = [
    {
      key: '1',
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
      key: '2',
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
        <Tabs defaultActiveKey="1" items={items} />
      </Card>
    </div>
  );
}

export default ClientDetailPage;
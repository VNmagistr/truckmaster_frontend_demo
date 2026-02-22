import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Table, Tag, message, Tabs } from 'antd';
import { EditOutlined, CarOutlined, FileTextOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { clientsAPI, trucksAPI, ordersAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatPhone, formatDate, formatMoney } from '../../utils/formatters';

function ClientDetailPage() {
  const [client, setClient] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0); // Новий стан для лічильника
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      // 🔥 ОПТИМІЗАЦІЯ:
      // 1. Вантажівки зазвичай їх небагато, беремо всі.
      // 2. Замовлення: беремо ТІЛЬКИ перші 20 штук + сортуємо нові зверху.
      const [clientResponse, trucksResponse, ordersResponse] = await Promise.all([
        clientsAPI.getById(id),
        trucksAPI.getAll({ client: id }).catch(() => ({ data: [] })),
        ordersAPI.getAll({ 
            client: id, 
            page: 1, 
            page_size: 20, 
            ordering: '-created_at' 
        }).catch(() => ({ data: [] })),
      ]);

      const clientData = clientResponse.data || clientResponse;
      const trucksData = trucksResponse.data || trucksResponse;
      const ordersData = ordersResponse.data || ordersResponse;

      setClient(clientData);
      setTrucks(trucksData.results || trucksData || []);
      
      // Зберігаємо завантажені 20 замовлень
      setOrders(ordersData.results || ordersData || []);
      
      // Зберігаємо загальну кількість (сервер повертає count)
      // Якщо API не повернуло count, використовуємо довжину масиву
      setOrdersTotal(ordersData.count || (ordersData.results ? ordersData.results.length : ordersData.length) || 0);

    } catch (error) {
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
      render: (vin) => vin ? `...${vin}` : '-',
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
      title: 'Сума', 
      dataIndex: 'total_amount', 
      key: 'total_amount',
      render: (amount) => formatMoney(amount)
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
          {/* Використовуємо загальну кількість, а не довжину масиву */}
          Замовлення ({ordersTotal})
        </span>
      ),
      children: (
        <Table
          columns={ordersColumns}
          dataSource={orders}
          rowKey="id"
          // Показуємо, що це не всі дані (можна додати повноцінну пагінацію пізніше)
          footer={() => ordersTotal > 20 ? <div style={{textAlign: 'center', color: '#999'}}>Показано останні 20 замовлень</div> : null}
          pagination={false} 
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
import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Table, Tag, message, Tabs } from 'antd';
import { EditOutlined, CarOutlined, FileTextOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clientsAPI, trucksAPI, ordersAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatPhone, formatDate, formatMoney } from '../../utils/formatters';

function ClientDetailPage() {
  const { t } = useTranslation();
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
      message.error(t('clients.loadDetailError'));
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const trucksColumns = [
    {
      title: t('trucks.licensePlate'),
      dataIndex: 'license_plate',
      key: 'license_plate',
      render: (text, record) => (
        <Link to={`/trucks/${record.id}`}>{text}</Link>
      ),
    },
    {
      title: t('trucks.model'),
      dataIndex: 'specific_model_name',
      key: 'model',
    },
    {
      title: t('trucks.vin'),
      dataIndex: 'last_seven_vin',
      key: 'vin',
      render: (vin) => vin ? `...${vin}` : '-',
    },
    {
      title: t('trucks.euroStandard'),
      dataIndex: 'euro_standard',
      key: 'euro',
      render: (euro) => euro ? <Tag>{euro}</Tag> : '-',
    },
  ];

  const ordersColumns = [
    {
      title: t('orders.orderNumber'),
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text, record) => (
        <Link to={`/orders/${record.id}`}>{text || `#${record.id}`}</Link>
      ),
    },
    {
      title: t('common.truck'),
      dataIndex: 'truck',
      key: 'truck',
      render: (truck) => truck?.license_plate || '-',
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => <StatusTag status={status} type="order" />,
    },
    {
      title: t('common.amount'),
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => formatMoney(amount)
    },
    {
      title: t('common.date'),
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
          {t('clients.trucksCount', { count: trucks.length })}
        </span>
      ),
      children: (
        <Table
          columns={trucksColumns}
          dataSource={trucks}
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: t('clients.noTrucks') }}
        />
      ),
    },
    {
      key: 'orders',
      label: (
        <span>
          <FileTextOutlined />
          {/* Використовуємо загальну кількість, а не довжину масиву */}
          {t('clients.ordersCount', { count: ordersTotal })}
        </span>
      ),
      children: (
        <Table
          columns={ordersColumns}
          dataSource={orders}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          // Показуємо, що це не всі дані (можна додати повноцінну пагінацію пізніше)
          footer={() => ordersTotal > 20 ? <div style={{textAlign: 'center', color: '#999'}}>{t('clients.last20')}</div> : null}
          pagination={false}
          locale={{ emptyText: t('clients.noOrders') }}
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
            {t('common.edit')}
          </Button>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label={t('common.phone')}>
            {formatPhone(client.phone)}
          </Descriptions.Item>
          <Descriptions.Item label={t('common.email')}>
            {client.email || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('clients.telegram')}>
            {client.telegram_chat_id ? (
              <Tag color="blue">{t('clients.connected')}</Tag>
            ) : (
              <Tag>{t('clients.notConnected')}</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t('common.address')} span={3}>
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
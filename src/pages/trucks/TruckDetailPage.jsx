import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Table, Tag, message, Tabs } from 'antd';
import { EditOutlined, FileTextOutlined, ToolOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { trucksAPI, ordersAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatDate } from '../../utils/formatters';
import { EURO_STANDARDS } from '../../utils/constants';

function TruckDetailPage() {
  const [truck, setTruck] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0); // Лічильник замовлень
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTruckData();
  }, [id]);

  const fetchTruckData = async () => {
    setLoading(true);
    try {
      // 🔥 ОПТИМІЗАЦІЯ: Вантажимо тільки останні 20 замовлень
      const [truckResponse, ordersResponse] = await Promise.all([
        trucksAPI.getById(id),
        ordersAPI.getAll({ 
          truck: id, 
          page_size: 20,
          ordering: '-created_at' 
        }).catch(() => ({ data: [] })),
      ]);

      // 🔥 ВИПРАВЛЕННЯ: Розпаковуємо .data
      const truckData = truckResponse.data || truckResponse;
      const ordersData = ordersResponse.data || ordersResponse;

      setTruck(truckData);

      // Зберігаємо замовлення та їх кількість
      setOrders(ordersData.results || ordersData || []);
      setOrdersTotal(ordersData.count || (ordersData.results ? ordersData.results.length : ordersData.length) || 0);

    } catch (error) {
      console.error('Error fetching truck:', error);
      message.error('Не вдалося завантажити дані вантажівки');
      navigate('/trucks');
    } finally {
      setLoading(false);
    }
  };

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
      title: 'Опис проблеми',
      dataIndex: 'problem_description',
      key: 'problem',
      ellipsis: true,
      render: (text) => text || '-',
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
  if (!truck) return null;

  const tabItems = [
    {
      key: 'orders',
      label: (
        <span>
          <FileTextOutlined />
          Історія замовлень ({ordersTotal})
        </span>
      ),
      children: (
        <Table
          columns={ordersColumns}
          dataSource={orders}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'Немає замовлень' }}
          footer={() => ordersTotal > 20 ? <div style={{textAlign: 'center', color: '#999'}}>Показано останні 20 записів</div> : null}
        />
      ),
    },
    {
      key: 'maintenance',
      label: (
        <span>
          <ToolOutlined />
          Технічне обслуговування
        </span>
      ),
      children: (
        <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
          Інформація про ТО буде доступна пізніше
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={truck.license_plate}
        subtitle={truck.specific_model_name}
        showBack
        extra={
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/trucks/${id}/edit`)}
          >
            Редагувати
          </Button>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="Номерний знак">
            <strong>{truck.license_plate}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Модель">
            {truck.specific_model_name}
          </Descriptions.Item>
          <Descriptions.Item label="Базова модель">
            {truck.base_model?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Повний VIN">
            <code>{truck.full_vin}</code>
          </Descriptions.Item>
          <Descriptions.Item label="Останні 7 VIN">
            <code>...{truck.last_seven_vin}</code>
          </Descriptions.Item>
          <Descriptions.Item label="Євростандарт">
            {truck.euro_standard ? (
              <Tag color="blue">
                {EURO_STANDARDS[truck.euro_standard]?.label || truck.euro_standard}
              </Tag>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Власник">
            {truck.client ? (
              <Link to={`/clients/${truck.client.id || truck.client}`}>
                {truck.client.name || truck.client}
              </Link>
            ) : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}

export default TruckDetailPage;
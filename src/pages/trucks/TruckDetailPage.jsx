import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Table, Tag, message, Tabs } from 'antd';
import { EditOutlined, FileTextOutlined, ToolOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { trucksAPI, ordersAPI, baseModelsAPI, clientsAPI } from '../../api'; // Додали clientsAPI та baseModelsAPI
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatDate } from '../../utils/formatters';
import { EURO_STANDARDS } from '../../utils/constants';

function TruckDetailPage() {
  const [truck, setTruck] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Додаткові стани для назв, якщо сервер повертає лише ID
  const [baseModelName, setBaseModelName] = useState(null);
  const [clientName, setClientName] = useState(null);

  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTruckData();
  }, [id]);

  const fetchTruckData = async () => {
    setLoading(true);
    try {
      const [truckResponse, ordersResponse] = await Promise.all([
        trucksAPI.getById(id),
        ordersAPI.getAll({ truck: id, page_size: 20, ordering: '-created_at' }).catch(() => ({ data: [] })),
      ]);

      const truckData = truckResponse.data || truckResponse;
      const ordersData = ordersResponse.data || ordersResponse;

      setTruck(truckData);
      setOrders(ordersData.results || ordersData || []);

      // --- ЛОГІКА ДОВАНТАЖЕННЯ НАЗВ (якщо прийшли тільки ID) ---
      
      // 1. Базова модель
      if (truckData.base_model) {
        if (typeof truckData.base_model === 'object') {
          setBaseModelName(truckData.base_model.name);
        } else {
            // Якщо прийшло ID, пробуємо знайти його (або зробити запит, але це довго)
            // Краще зробити окремий запит на отримання всіх моделей і знайти потрібну, 
            // або запит конкретної моделі, якщо є такий ендпоінт.
            // Спробуємо отримати всі моделі (їх мало) і знайти.
             baseModelsAPI.getAll().then(res => {
                 const models = res.data?.results || res.data || [];
                 const found = models.find(m => m.id === truckData.base_model);
                 if (found) setBaseModelName(found.name);
             }).catch(err => console.error("Failed to load base model name", err));
        }
      }

      // 2. Клієнт
      if (truckData.client) {
        if (typeof truckData.client === 'object') {
          setClientName(truckData.client.name);
        } else {
          // Якщо прийшло ID клієнта, робимо запит за цим клієнтом
          clientsAPI.getById(truckData.client).then(res => {
              const cData = res.data || res;
              setClientName(cData.name);
          }).catch(err => console.error("Failed to load client name", err));
        }
      }

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
          Історія замовлень ({orders.length})
        </span>
      ),
      children: (
        <Table
          columns={ordersColumns}
          dataSource={orders}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'Немає замовлень' }}
          footer={() => orders.length >= 20 ? <div style={{textAlign: 'center', color: '#999'}}>Показано останні 20</div> : null}
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
            {baseModelName || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Повний VIN">
            <code>{truck.full_vin}</code>
          </Descriptions.Item>
          <Descriptions.Item label="Останні 7 VIN">
            <code>{truck.last_seven_vin}</code>
          </Descriptions.Item>
          <Descriptions.Item label="Євростандарт">
            {truck.euro_standard ? (
              <Tag color="blue">
                {EURO_STANDARDS[truck.euro_standard]?.label || truck.euro_standard}
              </Tag>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Власник">
             {/* Використовуємо clientName, який ми довантажили */}
             {clientName ? (
                <Link to={`/clients/${typeof truck.client === 'object' ? truck.client.id : truck.client}`}>
                    {clientName}
                </Link>
             ) : (
                 truck.client ? truck.client : '-'
             )}
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
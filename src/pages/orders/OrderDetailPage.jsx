import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Table, Tag, message, Tabs, Space } from 'antd';
import { EditOutlined, PrinterOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ordersAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatDate, formatDateTime, formatMoney } from '../../utils/formatters';

function OrderDetailPage() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const data = await ordersAPI.getById(id);
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      message.error('Не вдалося завантажити дані замовлення');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const worksColumns = [
    {
      title: 'Робота',
      dataIndex: ['work', 'name'],
      key: 'work',
      render: (_, record) => record.work?.name || record.description || '-',
    },
    {
      title: 'Виконавець',
      dataIndex: ['employee', 'name'],
      key: 'employee',
      render: (_, record) => record.employee?.name || '-',
    },
    {
      title: 'Годин',
      dataIndex: 'hours_spent',
      key: 'hours',
      render: (hours) => hours || '-',
    },
  ];

  const partsColumns = [
    {
      title: 'Запчастина',
      dataIndex: ['part', 'name'],
      key: 'part',
      render: (_, record) => record.part?.name || '-',
    },
    {
      title: 'Артикул',
      dataIndex: ['part', 'sku_code'],
      key: 'sku',
      render: (_, record) => record.part?.sku_code || '-',
    },
    {
      title: 'Кількість',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Ціна',
      dataIndex: ['part', 'selling_price'],
      key: 'price',
      render: (_, record) => formatMoney(record.part?.selling_price),
    },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!order) {
    return null;
  }

  const allParts = order.works?.flatMap(work => 
    work.used_parts?.map(part => ({ ...part, work_name: work.work?.name })) || []
  ) || [];

  const tabItems = [
    {
      key: 'works',
      label: `Виконані роботи (${order.works?.length || 0})`,
      children: (
        <Table
          columns={worksColumns}
          dataSource={order.works || []}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'Роботи не додано' }}
        />
      ),
    },
    {
      key: 'parts',
      label: `Використані запчастини (${allParts.length})`,
      children: (
        <Table
          columns={partsColumns}
          dataSource={allParts}
          rowKey={(record, index) => `${record.id}-${index}`}
          pagination={false}
          locale={{ emptyText: 'Запчастини не використано' }}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Замовлення ${order.order_number || `#${order.id}`}`}
        showBack
        extra={
          <Space>
            <Button icon={<PrinterOutlined />}>Друк</Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/orders/${id}/edit`)}
            >
              Редагувати
            </Button>
          </Space>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="Номер">
            <strong>{order.order_number || `#${order.id}`}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Статус">
            <StatusTag status={order.status} type="order" />
          </Descriptions.Item>
          <Descriptions.Item label="Загальна сума">
            <strong style={{ color: '#52c41a' }}>
              {formatMoney(order.total_cost)}
            </strong>
          </Descriptions.Item>
          <Descriptions.Item label="Клієнт">
            {order.client ? (
              <Link to={`/clients/${order.client.id}`}>
                {order.client.name}
              </Link>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Вантажівка">
            {order.truck ? (
              <Link to={`/trucks/${order.truck.id}`}>
                {order.truck.license_plate} ({order.truck.specific_model_name})
              </Link>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="VIN">
            {order.truck?.last_seven_vin ? `...${order.truck.last_seven_vin}` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Дата створення">
            {formatDateTime(order.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Дата оновлення">
            {formatDateTime(order.updated_at)}
          </Descriptions.Item>
        </Descriptions>
        
        {order.problem_description && (
          <div style={{ marginTop: 16 }}>
            <strong>Опис проблеми:</strong>
            <p style={{ marginTop: 8, color: '#666' }}>{order.problem_description}</p>
          </div>
        )}
      </Card>

      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}

export default OrderDetailPage;
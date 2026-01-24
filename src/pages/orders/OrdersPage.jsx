import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Popconfirm, Card, Select } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../../api';
import { PageHeader, LoadingSpinner, EmptyState, StatusTag } from '../../components';
import { formatDate } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState(''); // Пошук
  const [statusFilter, setStatusFilter] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Завантажуємо ВСІ замовлення для швидкого пошуку на клієнті
      const params = {
        ordering: '-created_at',
      };
      
      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await ordersAPI.getAll(params);
      setOrders(response.results || response || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      message.error('Не вдалося завантажити список замовлень');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await ordersAPI.delete(id);
      message.success('Замовлення видалено');
      fetchOrders();
    } catch (error) {
      message.error('Не вдалося видалити замовлення');
    }
  };

  // --- ЛОГІКА ПОШУКУ ---
  const filteredOrders = orders.filter(order => {
    const value = searchText.toLowerCase();
    const orderNum = order.order_number ? String(order.order_number).toLowerCase() : String(order.id);
    const truckPlate = order.truck?.license_plate?.toLowerCase() || '';
    const clientName = order.client?.name?.toLowerCase() || '';

    return (
      orderNum.includes(value) ||
      truckPlate.includes(value) ||
      clientName.includes(value)
    );
  });

  const columns = [
    {
      title: '№',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text, record) => <Link to={`/orders/${record.id}`}>{text || `#${record.id}`}</Link>,
      sorter: (a, b) => (a.order_number || a.id) - (b.order_number || b.id),
    },
    {
      title: 'Клієнт',
      dataIndex: ['client', 'name'],
      key: 'client',
      render: (text, record) => record.client ? <Link to={`/clients/${record.client.id}`}>{text}</Link> : '-',
    },
    {
      title: 'Вантажівка',
      dataIndex: ['truck', 'license_plate'],
      key: 'truck',
      render: (text, record) => record.truck ? <Link to={`/trucks/${record.truck.id}`}>{text}</Link> : '-',
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
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
    },
    {
      title: 'Дії',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EyeOutlined />} onClick={() => navigate(`/orders/${record.id}`)} />
          <Button icon={<EditOutlined />} onClick={() => navigate(`/orders/${record.id}/edit`)} />
          <Popconfirm title="Видалити замовлення?" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Наряди-замовлення"
        extra={
          <Space>
            {/* ПОЛЕ ПОШУКУ */}
            <Input
              placeholder="Пошук (№, авто, клієнт)..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
            
            <Select
              placeholder="Статус"
              allowClear
              style={{ width: 150 }}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
            >
              {Object.values(ORDER_STATUSES).map(status => (
                <Select.Option key={status.value} value={status.value}>
                  {status.label}
                </Select.Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/orders/new')}
            >
              Нове замовлення
            </Button>
          </Space>
        }
      />

      <Card>
        {orders.length > 0 ? (
          <Table
            columns={columns}
            dataSource={filteredOrders} // Відфільтровані дані
            rowKey="id"
            // Пагінація тепер на клієнті
            pagination={{ 
              pageSize: 20,
              showSizeChanger: true, 
              showTotal: (total, range) => `${range[0]}-${range[1]} з ${total}`
            }}
          />
        ) : (
          <EmptyState
            description="Замовлень поки немає"
            buttonText="Створити замовлення"
            onButtonClick={() => navigate('/orders/new')}
          />
        )}
      </Card>
    </div>
  );
}

export default OrdersPage;
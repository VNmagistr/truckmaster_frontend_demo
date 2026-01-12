import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Popconfirm, Card, Select } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../../api';
import { PageHeader, LoadingSpinner, EmptyState, StatusTag } from '../../components';
import { formatDate, formatMoney } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, [pagination.current, pagination.pageSize, statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
        ordering: '-created_at',
      };
      
      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await ordersAPI.getAll(params);

      const data = response.results || response;
      setOrders(Array.isArray(data) ? data : []);
      setPagination(prev => ({
        ...prev,
        total: response.count || data.length || 0,
      }));
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
      message.success('Замовлення успішно видалено');
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      message.error('Не вдалося видалити замовлення');
    }
  };

  const handleTableChange = (paginationConfig) => {
    setPagination({
      ...pagination,
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
    });
  };

  const getColumnSearchProps = (dataIndex, placeholder) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          placeholder={placeholder}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Пошук
          </Button>
          <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 90 }}>
            Скинути
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
    onFilter: (value, record) => {
      const fieldValue = dataIndex.includes('.')
        ? dataIndex.split('.').reduce((obj, key) => obj?.[key], record)
        : record[dataIndex];
      return fieldValue?.toString().toLowerCase().includes(value.toLowerCase());
    },
  });

  const columns = [
    {
      title: '№ Замовлення',
      dataIndex: 'order_number',
      key: 'order_number',
      ...getColumnSearchProps('order_number', 'Пошук по номеру'),
      render: (text, record) => (
        <Link to={`/orders/${record.id}`} style={{ fontWeight: 500 }}>
          {text || `#${record.id}`}
        </Link>
      ),
    },
    {
      title: 'Клієнт',
      dataIndex: ['client', 'name'],
      key: 'client',
      render: (_, record) => record.client ? (
        <Link to={`/clients/${record.client.id}`}>
          {record.client.name}
        </Link>
      ) : '-',
    },
    {
      title: 'Вантажівка',
      dataIndex: ['truck', 'license_plate'],
      key: 'truck',
      render: (_, record) => record.truck ? (
        <Link to={`/trucks/${record.truck.id}`}>
          {record.truck.license_plate}
        </Link>
      ) : '-',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <StatusTag status={status} type="order" />,
    },
    {
      title: 'Сума',
      dataIndex: 'total_cost',
      key: 'total_cost',
      render: (cost) => cost ? formatMoney(cost) : '-',
    },
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: true,
      render: (date) => formatDate(date),
    },
    {
      title: 'Дії',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/orders/${record.id}`)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => navigate(`/orders/${record.id}/edit`)}
          />
          <Popconfirm
            title="Видалити замовлення?"
            description="Ця дія незворотна."
            onConfirm={() => handleDelete(record.id)}
            okText="Так"
            cancelText="Ні"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading && orders.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <PageHeader
        title="Замовлення-наряди"
        subtitle={`Всього: ${pagination.total}`}
        extra={
          <Space>
            <Select
              placeholder="Фільтр по статусу"
              allowClear
              style={{ width: 180 }}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPagination(prev => ({ ...prev, current: 1 }));
              }}
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
            dataSource={orders}
            rowKey="id"
            loading={loading}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} з ${total}`,
            }}
            onChange={handleTableChange}
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
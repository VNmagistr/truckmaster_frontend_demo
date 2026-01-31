import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Popconfirm, Card, Select } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../../api';
import { PageHeader, StatusTag } from '../../components';
import { formatDate } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Стани для пагінації та фільтрів
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  
  const navigate = useNavigate();

  // Завантажуємо дані при зміні сторінки, пошуку або статусу
  useEffect(() => {
    fetchOrders(pagination.current, pagination.pageSize, searchText, statusFilter);
  }, [pagination.current, pagination.pageSize, statusFilter]); 
  // searchText додамо в окремий ефект з debounce (затримкою), або по Enter, 
  // поки що залишимо просту логіку: пошук спрацює при вводі, але краще додати кнопку або debounce.

  // Обробка пошуку (з затримкою, щоб не спамити сервер)
  useEffect(() => {
    const timer = setTimeout(() => {
        fetchOrders(1, pagination.pageSize, searchText, statusFilter);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchText]);

  const fetchOrders = async (page, pageSize, search, status) => {
    setLoading(true);
    try {
      const params = {
        page: page,
        page_size: pageSize,
        ordering: '-created_at',
      };
      
      if (search) params.search = search; // Сервер повинен підтримувати ?search=
      if (status) params.status = status;

      const response = await ordersAPI.getAll(params);
      const data = response.data || response;
      
      setOrders(data.results || []);
      setPagination(prev => ({
        ...prev,
        current: page,
        pageSize: pageSize,
        total: data.count || 0,
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
      message.success('Замовлення видалено');
      fetchOrders(pagination.current, pagination.pageSize, searchText, statusFilter);
    } catch (error) {
      message.error('Не вдалося видалити замовлення');
    }
  };

  const handleTableChange = (newPagination) => {
    setPagination(prev => ({
        ...prev,
        current: newPagination.current,
        pageSize: newPagination.pageSize
    }));
    // fetchOrders викликається через useEffect
  };

  const columns = [
    {
      title: '№',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text, record) => <Link to={`/orders/${record.id}`}>{text || `#${record.id}`}</Link>,
      sorter: false, // Сортування поки вимкнемо, бо воно має бути серверним
    },
    {
      title: 'Клієнт',
      dataIndex: ['client', 'name'],
      key: 'client',
      render: (text, record) => {
          const clientName = record.client?.name || record.client_name || '-';
          const clientId = record.client?.id || (typeof record.client === 'object' ? null : record.client);
          return clientId ? <Link to={`/clients/${clientId}`}>{clientName}</Link> : clientName;
      },
    },
    {
      title: 'Вантажівка',
      dataIndex: ['truck', 'license_plate'],
      key: 'truck',
      render: (text, record) => {
          const plate = record.truck?.license_plate || record.truck_plate || '-';
          const truckId = record.truck?.id || (typeof record.truck === 'object' ? null : record.truck);
          return truckId ? <Link to={`/trucks/${truckId}`}>{plate}</Link> : plate;
      },
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

  return (
    <div>
      <PageHeader
        title="Наряди-замовлення"
        extra={
          <Space>
            <Input
              placeholder="Пошук..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchText}
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
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} з ${total}`
          }}
          onChange={handleTableChange}
          loading={loading}
        />
      </Card>
    </div>
  );
}

export default OrdersPage;
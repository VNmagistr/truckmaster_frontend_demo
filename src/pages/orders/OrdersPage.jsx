import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Modal, Card, Select, Tag, Form, Tooltip } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ordersAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import { formatDate } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';

const { confirm } = Modal;

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Пагінація
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  
  // Стан для модального вікна видалення
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleteForm] = Form.useForm();
  const [markingLoading, setMarkingLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders(pagination.current, pagination.pageSize, statusFilter, searchText);
  }, [pagination.current, pagination.pageSize, statusFilter]);

  // Додаємо debounce для пошуку
  useEffect(() => {
    const timer = setTimeout(() => {
        if (searchText !== '') {
            fetchOrders(1, pagination.pageSize, statusFilter, searchText);
        }
    }, 600);
    return () => clearTimeout(timer);
  }, [searchText]);

  const fetchOrders = async (page, pageSize, status, search) => {
    setLoading(true);
    try {
      const params = {
        page: page,
        page_size: pageSize,
        ordering: '-created_at',
      };
      
      if (status) params.status = status;
      if (search) params.search = search;

      const response = await ordersAPI.getAll(params);
      const data = response.data || response; // Обробка різних форматів відповіді

      setOrders(data.results || []);
      setPagination({
        ...pagination,
        current: page,
        total: data.count || 0,
      });
    } catch (error) {
      console.error('Fetch error:', error);
      message.error('Помилка завантаження замовлень');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
  };

  // Відкриття модалки для видалення
  const showDeleteConfirm = (order) => {
    setOrderToDelete(order);
    deleteForm.resetFields();
    setIsDeleteModalOpen(true);
  };

  // Логіка "М'якого видалення" (Mark for deletion)
  const handleMarkForDeletion = async (values) => {
    if (!orderToDelete) return;
    
    setMarkingLoading(true);
    try {
        const formData = new FormData();
        formData.append('marked_for_deletion', 'true');
        formData.append('deletion_reason', values.reason);

        // Використовуємо update (PATCH) замість delete
        await ordersAPI.update(orderToDelete.id, formData);
        
        message.success('Замовлення позначено на видалення. Адміністратор перевірить запит.');
        setIsDeleteModalOpen(false);
        setOrderToDelete(null);
        
        // Оновлюємо список
        fetchOrders(pagination.current, pagination.pageSize, statusFilter, searchText);
    } catch (error) {
        console.error('Delete mark error:', error);
        message.error('Не вдалося позначити на видалення');
    } finally {
        setMarkingLoading(false);
    }
  };

  const columns = [
    {
      title: 'Номер',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text, record) => (
        <Space>
            <span style={{ fontWeight: 'bold' }}>{text}</span>
            {record.marked_for_deletion && (
                <Tag color="error">На видалення</Tag>
            )}
        </Space>
      )
    },
    {
      title: 'Авто',
      key: 'truck',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.truck?.license_plate || '-'}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            {record.truck?.specific_model_name || record.truck?.model || ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Клієнт',
      dataIndex: ['client', 'name'],
      key: 'client',
      render: (text) => text || '-',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = Object.values(ORDER_STATUSES).find(s => s.value === status);
        return <Tag color={statusConfig?.color || 'default'}>{statusConfig?.label || status}</Tag>;
      },
    },
    {
      title: 'Сума',
      dataIndex: 'total_cost',
      key: 'total_cost',
      render: (val) => val ? `${parseFloat(val).toFixed(2)} грн` : '0.00 грн',
    },
    {
      title: 'Створено',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => formatDate(date),
    },
    {
      title: 'Дії',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Перегляд">
            <Button 
                icon={<EyeOutlined />} 
                onClick={() => navigate(`/orders/${record.id}`)} 
                size="small"
            />
          </Tooltip>
          
          <Tooltip title="Редагувати">
            <Button 
                icon={<EditOutlined />} 
                onClick={() => navigate(`/orders/${record.id}/edit`)} 
                disabled={record.marked_for_deletion} // Блокуємо, якщо вже позначено
                size="small"
            />
          </Tooltip>

          <Tooltip title={record.marked_for_deletion ? "Вже очікує видалення" : "Позначити на видалення"}>
            <Button 
                danger 
                icon={<DeleteOutlined />} 
                onClick={() => showDeleteConfirm(record)} 
                disabled={record.marked_for_deletion} // Блокуємо, якщо вже позначено
                size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader 
        title="Замовлення" 
        extra={
          <Space>
            <Input
              placeholder="Пошук (номер, авто, клієнт)"
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            
            <Select
              placeholder="Всі статуси"
              allowClear
              style={{ width: 160 }}
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
            loading={loading}
            pagination={{ 
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true, 
              showTotal: (total, range) => `${range[0]}-${range[1]} з ${total}`
            }}
            onChange={handleTableChange}
          />
      </Card>

      {/* Модальне вікно для підтвердження видалення */}
      <Modal
        title={
            <Space>
                <ExclamationCircleOutlined style={{ color: 'red' }} />
                <span>Запит на видалення</span>
            </Space>
        }
        open={isDeleteModalOpen}
        onCancel={() => {
            setIsDeleteModalOpen(false);
            deleteForm.resetFields();
        }}
        confirmLoading={markingLoading}
        onOk={() => deleteForm.submit()}
        okText="Підтвердити"
        okType="danger"
        cancelText="Скасувати"
      >
        <p>Ви впевнені, що хочете видалити замовлення <b>{orderToDelete?.order_number}</b>?</p>
        <p>Це дія не видалить замовлення остаточно, а відправить запит адміністратору.</p>
        
        <Form form={deleteForm} layout="vertical" onFinish={handleMarkForDeletion}>
            <Form.Item 
                name="reason" 
                label="Причина видалення" 
                rules={[{ required: true, message: 'Будь ласка, вкажіть причину' }]}
            >
                <Input.TextArea rows={3} placeholder="Наприклад: Дублікат, помилково створено..." />
            </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default OrdersPage;
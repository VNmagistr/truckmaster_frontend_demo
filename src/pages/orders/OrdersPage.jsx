import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Modal, Card, Select, Tag, Form, Tooltip, Typography } from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  ExclamationCircleOutlined,
  UndoOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ordersAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import { formatDate } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';

const { Text } = Typography;

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
  const [showDeleted, setShowDeleted] = useState(false);
  
  // Стан для модального вікна видалення
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleteForm] = Form.useForm();
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders(pagination.current, pagination.pageSize, statusFilter, searchText);
  }, [pagination.current, pagination.pageSize, statusFilter, showDeleted]);

  // Debounce для пошуку
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders(1, pagination.pageSize, statusFilter, searchText);
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
      
      // Якщо показуємо видалені - додаємо фільтр
      if (showDeleted) {
        params.marked_for_deletion = true;
      }

      const response = await ordersAPI.getAll(params);
      const data = response.data || response;

      setOrders(data.results || []);
      setPagination(prev => ({
        ...prev,
        current: page,
        total: data.count || 0,
      }));
    } catch (error) {
      console.error('Fetch error:', error);
      message.error('Помилка завантаження замовлень');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (newPagination) => {
    setPagination(prev => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  // Відкриття модалки для позначення на видалення
  const showDeleteConfirm = (order) => {
    setOrderToDelete(order);
    deleteForm.resetFields();
    setIsDeleteModalOpen(true);
  };

  // Позначення на видалення
  const handleMarkForDeletion = async (values) => {
    if (!orderToDelete) return;
    
    setActionLoading(true);
    try {
      // Використовуємо спеціальний ендпоінт mark_for_deletion
      await ordersAPI.markForDeletion(orderToDelete.id, values.reason);
      
      message.success('Замовлення позначено на видалення. Адміністратор перевірить запит.');
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
      deleteForm.resetFields();
      
      // Оновлюємо список
      fetchOrders(pagination.current, pagination.pageSize, statusFilter, searchText);
    } catch (error) {
      console.error('Mark for deletion error:', error);
      const errorMsg = error.response?.data?.detail || 'Не вдалося позначити на видалення';
      message.error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Скасування позначення на видалення
  const handleUnmarkForDeletion = async (order) => {
    setActionLoading(true);
    try {
      await ordersAPI.unmarkForDeletion(order.id);
      
      message.success('Позначення на видалення скасовано');
      
      // Оновлюємо список
      fetchOrders(pagination.current, pagination.pageSize, statusFilter, searchText);
    } catch (error) {
      console.error('Unmark for deletion error:', error);
      const errorMsg = error.response?.data?.detail || 'Не вдалося скасувати позначення';
      message.error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: 'Номер',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ cursor: 'pointer' }} onClick={() => navigate(`/orders/${record.id}`)}>
            {text}
          </Text>
          {record.marked_for_deletion && (
            <Tag color="error" style={{ marginTop: 4 }}>На видалення</Tag>
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
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Переглянути">
            <Button 
              icon={<EyeOutlined />} 
              onClick={() => navigate(`/orders/${record.id}`)} 
              size="small"
            />
          </Tooltip>
          
          {!record.marked_for_deletion ? (
            <>
              <Tooltip title="Редагувати">
                <Button 
                  icon={<EditOutlined />} 
                  onClick={() => navigate(`/orders/${record.id}/edit`)} 
                  size="small"
                />
              </Tooltip>

              <Tooltip title="Позначити на видалення">
                <Button 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={() => showDeleteConfirm(record)} 
                  size="small"
                />
              </Tooltip>
            </>
          ) : (
            <Tooltip title="Скасувати видалення">
              <Button 
                icon={<UndoOutlined />} 
                onClick={() => handleUnmarkForDeletion(record)} 
                size="small"
                style={{ color: '#52c41a', borderColor: '#52c41a' }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // Додаємо колонку з причиною видалення якщо показуємо видалені
  if (showDeleted) {
    columns.splice(columns.length - 1, 0, {
      title: 'Причина видалення',
      dataIndex: 'deletion_reason',
      key: 'deletion_reason',
      width: 200,
      render: (text, record) => (
        <div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {text || '-'}
          </Text>
          {record.marked_for_deletion_by_name && (
            <div style={{ fontSize: '11px', color: '#999' }}>
              Позначив: {record.marked_for_deletion_by_name}
            </div>
          )}
        </div>
      ),
    });
  }

  return (
    <div>
      <PageHeader 
        title="Наряди-замовлення" 
        extra={
          <Space wrap>
            <Input
              placeholder="Пошук (номер, авто, клієнт)"
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
            
            <Select
              placeholder="Всі статуси"
              allowClear
              style={{ width: 150 }}
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
              type={showDeleted ? 'primary' : 'default'}
              danger={showDeleted}
              onClick={() => {
                setShowDeleted(!showDeleted);
                setPagination(prev => ({ ...prev, current: 1 }));
              }}
            >
              {showDeleted ? 'Приховати видалені' : 'Показати на видалення'}
            </Button>

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
          rowClassName={(record) => record.marked_for_deletion ? 'row-marked-for-deletion' : ''}
        />
      </Card>

      {/* Модальне вікно для підтвердження видалення */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <span>Позначити на видалення</span>
          </Space>
        }
        open={isDeleteModalOpen}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setOrderToDelete(null);
          deleteForm.resetFields();
        }}
        confirmLoading={actionLoading}
        onOk={() => deleteForm.submit()}
        okText="Підтвердити"
        okButtonProps={{ danger: true }}
        cancelText="Скасувати"
      >
        <p>
          Ви впевнені, що хочете позначити замовлення{' '}
          <Text strong>{orderToDelete?.order_number}</Text> на видалення?
        </p>
        <p style={{ color: '#666' }}>
          Замовлення не буде видалено одразу. Адміністратор перевірить запит і прийме рішення.
        </p>
        
        <Form form={deleteForm} layout="vertical" onFinish={handleMarkForDeletion}>
          <Form.Item 
            name="reason" 
            label="Причина видалення" 
            rules={[{ required: true, message: 'Будь ласка, вкажіть причину' }]}
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Наприклад: Дублікат, помилково створено, клієнт відмовився..." 
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* CSS для рядків позначених на видалення */}
      <style>{`
        .row-marked-for-deletion {
          background-color: #fff2f0 !important;
        }
        .row-marked-for-deletion:hover > td {
          background-color: #ffccc7 !important;
        }
      `}</style>
    </div>
  );
}

export default OrdersPage;
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Modal, Card, Select, Tag, Form, Tooltip, Typography, Divider, Pagination } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  UndoOutlined,
  CameraOutlined,
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

  const [stats, setStats] = useState(null);
  
  // Стан для модального вікна видалення
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleteForm] = Form.useForm();
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders(pagination.current, pagination.pageSize, statusFilter, searchText);
  }, [pagination.current, pagination.pageSize, statusFilter, showDeleted]);

  useEffect(() => {
    ordersAPI.getStats()
      .then(res => setStats(res.data || res))
      .catch(() => {});
  }, []);

  // Debounce для пошуку
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText.length > 0 && searchText.length < 4) return;
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
      message.error('Помилка завантаження замовлень');
    } finally {
      setLoading(false);
    }
  };

  // Клік по рядку - перехід до деталей
  const handleRowClick = (record) => {
    navigate(`/orders/${record.id}`);
  };

  // Відкриття модалки для позначення на видалення
  const showDeleteConfirm = (e, order) => {
    e.stopPropagation(); // Зупиняємо спливання події щоб не спрацював клік по рядку
    setOrderToDelete(order);
    deleteForm.resetFields();
    setIsDeleteModalOpen(true);
  };

  // Позначення на видалення
  const handleMarkForDeletion = async (values) => {
    if (!orderToDelete) return;
    
    setActionLoading(true);
    try {
      await ordersAPI.markForDeletion(orderToDelete.id, values.reason);
      
      message.success('Замовлення позначено на видалення. Адміністратор перевірить запит.');
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
      deleteForm.resetFields();
      
      fetchOrders(pagination.current, pagination.pageSize, statusFilter, searchText);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Не вдалося позначити на видалення';
      message.error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Скасування позначення на видалення
  const handleUnmarkForDeletion = async (e, order) => {
    e.stopPropagation(); // Зупиняємо спливання події
    setActionLoading(true);
    try {
      await ordersAPI.unmarkForDeletion(order.id);
      
      message.success('Позначення на видалення скасовано');
      
      fetchOrders(pagination.current, pagination.pageSize, statusFilter, searchText);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Не вдалося скасувати позначення';
      message.error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Обробники для кнопок (зупиняють спливання)
  const handleEditClick = (e, record) => {
    e.stopPropagation();
    navigate(`/orders/${record.id}/edit`);
  };

  const formatDayHeader = (dayStr) => {
    const [year, month, day] = dayStr.split('-');
    const monthNames = ['січня','лютого','березня','квітня','травня','червня',
      'липня','серпня','вересня','жовтня','листопада','грудня'];
    return `${parseInt(day)} ${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const ordersWord = (n) =>
    (n % 100 >= 11 && n % 100 <= 19) || n % 10 >= 5 || n % 10 === 0
      ? 'замовлень' : 'замовлення';

  const buildTableData = (list) => {
    const result = [];
    let currentDay = null;
    list.forEach(order => {
      const day = order.created_at ? order.created_at.split('T')[0] : 'unknown';
      if (day !== currentDay) {
        currentDay = day;
        const dayCount = list.filter(o => (o.created_at || '').split('T')[0] === day).length;
        result.push({ _isSeparator: true, _day: day, _dayCount: dayCount, id: `sep_${day}` });
      }
      result.push(order);
    });
    return result;
  };

  const columns = [
    {
      title: 'Номер',
      dataIndex: 'order_number',
      key: 'order_number',
      onCell: (record) => record._isSeparator ? { colSpan: 99, style: { padding: 0 } } : {},
      render: (text, record) => {
        if (record._isSeparator) {
          return (
            <div style={{ padding: '7px 16px', backgroundColor: '#f5f5f5', borderLeft: '3px solid #d9d9d9' }}>
              <Text strong style={{ fontSize: 13, color: '#434343' }}>
                {formatDayHeader(record._day)}
              </Text>
              <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                {record._dayCount} {ordersWord(record._dayCount)}
              </Text>
            </div>
          );
        }
        return (
          <Space direction="vertical" size={0}>
            <Space size={6}>
              <Text strong style={{ color: '#1890ff', cursor: 'pointer' }}>
                {text}
              </Text>
              {record.photos_count > 0 && (
                <Tooltip title={`${record.photos_count} фото ремонту`}>
                  <Space size={2} style={{ color: '#f5c518', fontSize: 12 }}>
                    <CameraOutlined />
                    <span>{record.photos_count}</span>
                  </Space>
                </Tooltip>
              )}
            </Space>
            {record.marked_for_deletion && (
              <Tag color="error" style={{ marginTop: 4 }}>На видалення</Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Авто',
      key: 'truck',
      onCell: (record) => record._isSeparator ? { colSpan: 0 } : {},
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>{record.truck?.license_plate || '-'}</div>
          <div style={{ fontSize: '13px', color: '#888' }}>
            {record.truck?.specific_model_name || record.truck?.model || ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Клієнт',
      dataIndex: ['client', 'name'],
      key: 'client',
      onCell: (record) => record._isSeparator ? { colSpan: 0 } : {},
      render: (text) => <Text strong>{text || '-'}</Text>,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      onCell: (record) => record._isSeparator ? { colSpan: 0 } : {},
      render: (status) => {
        const statusConfig = Object.values(ORDER_STATUSES).find(s => s.value === status);
        return <Tag color={statusConfig?.color || 'default'}>{statusConfig?.label || status}</Tag>;
      },
    },
    {
      title: 'Сума',
      dataIndex: 'total_cost',
      key: 'total_cost',
      onCell: (record) => record._isSeparator ? { colSpan: 0 } : {},
      render: (val) => val ? `${parseFloat(val).toFixed(2)} грн` : '0.00 грн',
    },
    {
      title: 'Створено',
      dataIndex: 'created_at',
      key: 'created_at',
      onCell: (record) => record._isSeparator ? { colSpan: 0 } : {},
      render: (date) => formatDate(date),
    },
    {
      title: 'Дії',
      key: 'actions',
      width: 120,
      onCell: (record) => record._isSeparator ? { colSpan: 0 } : {},
      render: (_, record) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          {!record.marked_for_deletion ? (
            <>
              <Tooltip title="Редагувати">
                <Button 
                  icon={<EditOutlined />} 
                  onClick={(e) => handleEditClick(e, record)} 
                  size="small"
                />
              </Tooltip>

              <Tooltip title="Позначити на видалення">
                <Button 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={(e) => showDeleteConfirm(e, record)} 
                  size="small"
                />
              </Tooltip>
            </>
          ) : (
            <Tooltip title="Скасувати видалення">
              <Button 
                icon={<UndoOutlined />} 
                onClick={(e) => handleUnmarkForDeletion(e, record)} 
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
      onCell: (record) => record._isSeparator ? { colSpan: 0 } : {},
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
          <Space wrap align="center">
            {stats && (
              <>
                {[
                  { label: 'Всього за день', value: stats.today },
                  { label: 'Всього за тиждень', value: stats.week },
                  { label: 'Всього за місяць', value: stats.month },
                  { label: 'Всього за рік', value: stats.year },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    padding: '2px 14px',
                    textAlign: 'center',
                    minWidth: 68,
                    lineHeight: 1.3,
                    background: '#fff',
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#1677ff' }}>{value ?? '—'}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{label}</div>
                  </div>
                ))}
                <Divider type="vertical" style={{ height: 32, margin: '0 4px' }} />
              </>
            )}
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
          className="orders-table"
          columns={columns}
          dataSource={buildTableData(orders)}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={false}
          rowClassName={(record) => {
            if (record._isSeparator) return 'row-date-separator';
            return record.marked_for_deletion ? 'row-marked-for-deletion' : 'row-clickable';
          }}
          onRow={(record) => {
            if (record._isSeparator) return {};
            return { onClick: () => handleRowClick(record), style: { cursor: 'pointer' } };
          }}
        />
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            showSizeChanger
            pageSizeOptions={['10', '20', '50', '100']}
            showTotal={(total, range) => `${range[0]}-${range[1]} з ${total}`}
            onChange={(page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize }));
            }}
          />
        </div>
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

      {/* CSS для рядків */}
      <style>{`
        .row-marked-for-deletion {
          background-color: #fff2f0 !important;
        }
        .row-marked-for-deletion:hover > td {
          background-color: #ffccc7 !important;
        }
        .row-clickable:hover > td {
          background-color: #e6f7ff !important;
        }
        .row-date-separator > td {
          padding: 0 !important;
          background-color: #fafafa !important;
        }
        .row-date-separator:hover > td {
          background-color: #fafafa !important;
        }
        .orders-table .ant-table-cell {
          font-size: 15px;
        }
        .orders-table .ant-table-thead .ant-table-cell {
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

export default OrdersPage;
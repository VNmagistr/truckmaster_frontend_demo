import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Modal, Card, Select, Tag, Form, Tooltip, Typography, Divider, Pagination, Empty, DatePicker } from 'antd';
import dayjs from 'dayjs';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  UndoOutlined,
  CameraOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ordersAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';

const { Text } = Typography;

function OrdersPage() {
  const { t } = useTranslation();
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
  const [dateFilter, setDateFilter] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const [stats, setStats] = useState(null);
  
  // Стан для модального вікна видалення
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleteForm] = Form.useForm();
  const [actionLoading, setActionLoading] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [savingOrderId, setSavingOrderId] = useState(null);

  const [editingClosedAtId, setEditingClosedAtId] = useState(null);
  const [editingClosedAtValue, setEditingClosedAtValue] = useState(null);
  const [savingClosedAtId, setSavingClosedAtId] = useState(null);

  const [staleOrders, setStaleOrders] = useState([]);
  const [staleModalOpen, setStaleModalOpen] = useState(false);

  const navigate = useNavigate();

  const handleOrderNumberSave = async (record) => {
    const trimmed = editingValue.trim();
    if (!trimmed || trimmed === record.order_number) {
      setEditingOrderId(null);
      return;
    }
    setSavingOrderId(record.id);
    try {
      const checkResp = await ordersAPI.checkNumber({
        order_number: trimmed,
        truck_id: record.truck?.id,
        exclude_id: record.id,
      });
      const checkData = checkResp.data || checkResp;

      if (checkData.exists) {
        setSavingOrderId(null);
        setEditingOrderId(null);
        if (!checkData.same_truck) {
          const otherPlate = checkData.truck?.license_plate || '—';
          message.error(`${t('orders.numberUsed')} ${otherPlate}`);
          return;
        }
        const createdAt = checkData.created_at ? formatDate(checkData.created_at) : '—';
        const willChangeStatus = checkData.status === 'DONE' || checkData.status === 'CLOSED';
        Modal.confirm({
          title: t('orders.numberExists'),
          content: (
            <div>
              <p style={{ marginBottom: 8 }}>
                Наряд №<Text strong>{checkData.order_number}</Text> від {createdAt}
                <br />
                Авто: <Text strong>{checkData.truck?.license_plate || '—'}</Text>
                {checkData.truck?.model ? ` — ${checkData.truck.model}` : ''}
                <br />
                Статус: <Text strong>{checkData.status_display || checkData.status}</Text>
              </p>
              <p>{t('orders.continueQuestion')}</p>
              {willChangeStatus && (
                <p style={{ color: '#d48806', marginBottom: 0 }}>
                  Статус буде змінено на «В роботі».
                </p>
              )}
            </div>
          ),
          okText: t('orders.continueBtn'),
          cancelText: t('common.cancel'),
          onOk: async () => {
            try {
              await ordersAPI.continueOrder(checkData.order_id);
              message.success(
                willChangeStatus
                  ? t('orders.continueSuccess')
                  : t('orders.continueOpenExisting')
              );
              navigate(`/orders/${checkData.order_id}`);
            } catch {
              message.error(t('orders.continueError'));
            }
          },
        });
        return;
      }

      await ordersAPI.update(record.id, { order_number: trimmed });
      setOrders(prev => prev.map(o => o.id === record.id ? { ...o, order_number: trimmed } : o));
      message.success(t('orders.orderNumberSaved'));
    } catch (err) {
      const detail = err?.response?.data?.order_number?.[0]
        || err?.response?.data?.detail
        || t('orders.orderNumberError');
      message.error(detail);
    } finally {
      setSavingOrderId(null);
      setEditingOrderId(null);
    }
  };

  const handleClosedAtSave = async (record, value) => {
    setEditingClosedAtId(null);
    const newVal = value ? value.toISOString() : '';
    const oldVal = record.closed_at || '';
    if (newVal === oldVal) return;
    setSavingClosedAtId(record.id);
    try {
      await ordersAPI.update(record.id, { closed_at: newVal });
      setOrders(prev => prev.map(o => o.id === record.id ? { ...o, closed_at: newVal || null } : o));
      message.success(t('orders.closedDateSaved'));
    } catch {
      message.error(t('orders.closedDateError'));
    } finally {
      setSavingClosedAtId(null);
    }
  };

  useEffect(() => {
    fetchOrders(pagination.current, pagination.pageSize, statusFilter, searchText);
  }, [pagination.current, pagination.pageSize, statusFilter, showDeleted, dateFilter]);

  useEffect(() => {
    ordersAPI.getStats()
      .then(res => setStats(res.data || res))
      .catch(() => {});
    fetchStaleOrders();
  }, []);

  const fetchStaleOrders = async () => {
    try {
      const snoozedUntil = localStorage.getItem('stale_orders_snoozed_until');
      if (snoozedUntil && Date.now() < Number(snoozedUntil)) return;

      const res = await ordersAPI.getStaleInProgress();
      const data = res.data || res;
      if (data.length > 0) {
        setStaleOrders(data);
        setStaleModalOpen(true);
      }
    } catch {
      // silent
    }
  };

  const handleSnooze = (hours) => {
    localStorage.setItem('stale_orders_snoozed_until', String(Date.now() + hours * 3600000));
    setStaleModalOpen(false);
  };

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
      if (dateFilter) params.created_date = dateFilter.format('YYYY-MM-DD');

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
      message.error(t('orders.loadError'));
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
      
      message.success(t('orders.deleteMarkedSuccess'));
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
      deleteForm.resetFields();
      
      fetchOrders(pagination.current, pagination.pageSize, statusFilter, searchText);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || t('orders.deleteMarkedError');
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
      
      message.success(t('orders.deleteCancelledSuccess'));
      
      fetchOrders(pagination.current, pagination.pageSize, statusFilter, searchText);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || t('orders.deleteCancelledError');
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

  const formatDayHeader = (dayStr) => dayjs(dayStr).format('D MMMM YYYY');
  const ordersWord = (n) => t('orders.ordersMeasure');

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
      title: t('orders.orderNumber'),
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
            <Space size={6} onClick={e => e.stopPropagation()}>
              {editingOrderId === record.id ? (
                <Input
                  size="small"
                  autoFocus
                  value={editingValue}
                  onChange={e => setEditingValue(e.target.value)}
                  onBlur={() => handleOrderNumberSave(record)}
                  onPressEnter={() => handleOrderNumberSave(record)}
                  onKeyDown={e => { if (e.key === 'Escape') setEditingOrderId(null); }}
                  loading={savingOrderId === record.id}
                  style={{ width: 110, fontWeight: 600 }}
                />
              ) : (
                <Tooltip title={t('orders.editNumberTooltip')}>
                  <Text
                    strong
                    style={{ color: '#1890ff', cursor: 'pointer' }}
                    onDoubleClick={() => { setEditingOrderId(record.id); setEditingValue(record.order_number || ''); }}
                  >
                    {text}
                  </Text>
                </Tooltip>
              )}
              {record.photos_count > 0 && (
                <Tooltip title={`${record.photos_count} ${t('orders.repairPhotos')}`}>
                  <Space size={2} style={{ color: '#f5c518', fontSize: 12 }}>
                    <CameraOutlined />
                    <span>{record.photos_count}</span>
                  </Space>
                </Tooltip>
              )}
            </Space>
            {record.marked_for_deletion && (
              <Tag color="error" style={{ marginTop: 4 }}>{t('orders.markedForDeletion')}</Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: t('common.truck'),
      key: 'truck',
      onCell: (record) => record._isSeparator ? { colSpan: 0 } : {},
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>{record.truck?.license_plate || '-'}</div>
          <div style={{ fontSize: '13px', color: '#888' }}>
            {record.truck?.specific_model_name || record.truck?.model || ''}
          </div>
          {record.truck?.last_seven_vin && (
            <div style={{ fontSize: '13px', color: '#888' }}>
              {record.truck.last_seven_vin}
            </div>
          )}
        </div>
      ),
    },
    {
      title: t('common.client'),
      dataIndex: ['client', 'name'],
      key: 'client',
      onCell: (record) => record._isSeparator ? { colSpan: 0 } : {},
      render: (text) => <Text strong>{text || '-'}</Text>,
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      onCell: (record) => record._isSeparator ? { colSpan: 0 } : {},
      render: (status) => {
        const statusConfig = Object.values(ORDER_STATUSES).find(s => s.value === status);
        return <Tag color={statusConfig?.color || 'default'}>{statusConfig?.label || status}</Tag>;
      },
    },
    {
      title: t('common.amount'),
      dataIndex: 'total_cost',
      key: 'total_cost',
      onCell: (record) => record._isSeparator ? { colSpan: 0 } : {},
      render: (val) => val ? `${parseFloat(val).toFixed(2)} ${t('common.uah')}` : `0.00 ${t('common.uah')}`,
    },
    {
      title: t('orders.dateCreated'),
      dataIndex: 'created_at',
      key: 'created_at',
      onCell: (record) => record._isSeparator ? { colSpan: 0 } : {},
      render: (date) => formatDate(date),
    },
    {
      title: t('orders.dateClosed'),
      dataIndex: 'closed_at',
      key: 'closed_at',
      onCell: (record) => record._isSeparator ? { colSpan: 0 } : {},
      render: (date, record) => (
        <div onClick={e => e.stopPropagation()}>
          {editingClosedAtId === record.id ? (
            <DatePicker
              autoFocus
              size="small"
              showTime={{ format: 'HH:mm' }}
              format="DD.MM.YYYY HH:mm"
              value={editingClosedAtValue}
              onChange={val => setEditingClosedAtValue(val)}
              onOk={val => handleClosedAtSave(record, val)}
              onBlur={() => handleClosedAtSave(record, editingClosedAtValue)}
              allowClear
              style={{ width: 170 }}
            />
          ) : (
            <Tooltip title={t('orders.editNumberTooltip')}>
              <span
                style={{ cursor: 'pointer', color: date ? '#595959' : '#bfbfbf' }}
                onDoubleClick={() => {
                  setEditingClosedAtId(record.id);
                  setEditingClosedAtValue(date ? dayjs(date) : null);
                }}
              >
                {savingClosedAtId === record.id ? '...' : (date ? formatDateTime(date) : '—')}
              </span>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 120,
      onCell: (record) => record._isSeparator ? { colSpan: 0 } : {},
      render: (_, record) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          {!record.marked_for_deletion ? (
            <>
              <Tooltip title={t('common.edit')}>
                <Button 
                  icon={<EditOutlined />} 
                  onClick={(e) => handleEditClick(e, record)} 
                  size="small"
                />
              </Tooltip>

              <Tooltip title={t('orders.markForDeletion')}>
                <Button 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={(e) => showDeleteConfirm(e, record)} 
                  size="small"
                />
              </Tooltip>
            </>
          ) : (
            <Tooltip title={t('orders.cancelDeletion')}>
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
      title: t('orders.deleteReason'),
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
              {t('orders.deletionMarkedBy')} {record.marked_for_deletion_by_name}
            </div>
          )}
        </div>
      ),
    });
  }

  return (
    <div>
      <PageHeader
        title={t('orders.title')}
        extra={
          <Space wrap align="center">
            {stats && (
              <>
                {[
                  { label: t('orders.todayCount'), value: stats.today },
                  { label: t('orders.weekCount'), value: stats.week },
                  { label: t('orders.monthCount'), value: stats.month },
                  { label: t('orders.yearCount'), value: stats.year },
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
              placeholder={t('orders.searchPlaceholder')}
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
            
            <Select
              placeholder={t('common.allStatuses')}
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

            <DatePicker
              placeholder={t('orders.dateCreated')}
              format="DD.MM.YYYY"
              value={dateFilter}
              onChange={(value) => {
                setDateFilter(value);
                setPagination(prev => ({ ...prev, current: 1 }));
              }}
              allowClear
              style={{ width: 170 }}
            />

            <Button
              type={showDeleted ? 'primary' : 'default'}
              danger={showDeleted}
              onClick={() => {
                setShowDeleted(!showDeleted);
                setPagination(prev => ({ ...prev, current: 1 }));
              }}
            >
              {showDeleted ? t('orders.hideDeleted') : t('orders.showDeleted')}
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/orders/new')}
            >
              {t('orders.newOrder')}
            </Button>
          </Space>
        }
      />

      <Card>
        {!loading && pagination.total === 0 && !searchText && !statusFilter && !dateFilter && !showDeleted ? (
          <Empty
            image={<FileTextOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
            imageStyle={{ height: 80 }}
            description={
              <div>
                <Typography.Text style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>
                  {t('orders.emptyTitle')}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {t('orders.emptyDesc')}
                </Typography.Text>
              </div>
            }
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/orders/new')}>
              {t('orders.newOrder')}
            </Button>
          </Empty>
        ) : !loading && pagination.total === 0 ? (
          <Empty
            description={
              <Typography.Text type="secondary">
                {t('common.notFound')}
              </Typography.Text>
            }
          />
        ) : (
          <>
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
                showTotal={(total, range) => `${range[0]}-${range[1]} ${t('common.of')} ${total}`}
                onChange={(page, pageSize) => {
                  setPagination(prev => ({ ...prev, current: page, pageSize }));
                }}
              />
            </div>
          </>
        )}
      </Card>

      {/* Модальне вікно для підтвердження видалення */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <span>{t('orders.markForDeletion')}</span>
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
        okText={t('common.confirm')}
        okButtonProps={{ danger: true }}
        cancelText={t('common.cancel')}
      >
        <p>
          {t('orders.deleteConfirmDesc')}{' '}
          <Text strong>{orderToDelete?.order_number}</Text>?
        </p>
        <p style={{ color: '#666' }}>
          {t('orders.deleteConfirmNote')}
        </p>
        
        <Form form={deleteForm} layout="vertical" onFinish={handleMarkForDeletion}>
          <Form.Item 
            name="reason" 
            label={t('orders.deleteReason')}
            rules={[{ required: true, message: t('orders.deleteReasonPlaceholder') }]}
          >
            <Input.TextArea 
              rows={3} 
              placeholder={t('orders.deleteReasonExample')}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={staleModalOpen}
        onCancel={() => setStaleModalOpen(false)}
        width={560}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 22 }} />
            <span>{t('dashboard.staleOrdersTitle')}</span>
          </div>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Space size="small" wrap>
              <Button size="small" onClick={() => handleSnooze(1)}>
                {t('staleOrders.snooze1h')}
              </Button>
              <Button size="small" onClick={() => handleSnooze(3)}>
                {t('staleOrders.snooze3h')}
              </Button>
              <Button size="small" onClick={() => handleSnooze(24)}>
                {t('staleOrders.snooze1d')}
              </Button>
            </Space>
            <Button type="primary" onClick={() => setStaleModalOpen(false)}>
              {t('common.understood')}
            </Button>
          </div>
        }
      >
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          {t('dashboard.staleOrdersDesc')}
        </Typography.Text>
        <Table
          dataSource={staleOrders}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            {
              title: t('dashboard.staleOrderNumber'),
              dataIndex: 'order_number',
              key: 'order_number',
              render: (text, record) => (
                <Link to={`/orders/${record.id}`} style={{ color: '#1a1a1a', fontWeight: 600 }}>
                  {text || `#${record.id}`}
                </Link>
              ),
            },
            {
              title: t('common.client'),
              dataIndex: 'client_name',
              key: 'client_name',
              render: (v) => v || '—',
            },
            {
              title: t('common.truck'),
              dataIndex: 'truck_plate',
              key: 'truck_plate',
              render: (v) => v || '—',
            },
            {
              title: t('dashboard.staleInProgressSince'),
              dataIndex: 'in_progress_since',
              key: 'in_progress_since',
              render: (v) => v ? dayjs(v).format('DD.MM.YYYY') : '—',
            },
          ]}
        />
      </Modal>

    </div>
  );
}

export default OrdersPage;
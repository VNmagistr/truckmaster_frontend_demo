import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Table, message, Tabs, Space, Modal, Form, Select, InputNumber, Alert, Image, Row, Col, Empty, Input, Dropdown } from 'antd';
import { EditOutlined, PrinterOutlined, PlusOutlined, ToolOutlined, DeleteOutlined, ExclamationCircleOutlined, CameraOutlined, DownOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ordersAPI, worksAPI, employeesAPI, inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatMoney } from '../../utils/formatters';

function OrderDetailPage() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [isEditWorkModalOpen, setIsEditWorkModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [worksList, setWorksList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [partsList, setPartsList] = useState([]);

  const [formWork] = Form.useForm();
  const [formPart] = Form.useForm();
  const [formEditWork] = Form.useForm();
  
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    initPage();
  }, [id]);

  const initPage = async () => {
    setLoading(true);
    try {
      const response = await ordersAPI.getById(id);
      const data = response.data || response;
      
      if (!data) throw new Error("Дані замовлення відсутні");
      setOrder(data);

      loadDirectories();
    } catch (error) {
      message.error('Не вдалося завантажити замовлення (можливо, воно видалене)');
    } finally {
      setLoading(false);
    }
  };

  const ensureArray = (input) => {
      if (!input) return [];
      if (Array.isArray(input)) return input;
      if (input.data?.results && Array.isArray(input.data.results)) return input.data.results;
      if (input.data && Array.isArray(input.data)) return input.data;
      if (input.results && Array.isArray(input.results)) return input.results;
      return [];
  };

  const loadDirectories = async () => {
    try {
        const fetchAllPages = async (apiCall, pageSize = 50) => {
          let allResults = [];
          let page = 1;
          let hasMore = true;
          
          while (hasMore) {
            try {
              const response = await apiCall({ page, page_size: pageSize });
              const data = response.data || response;
              const results = data.results || data || [];
              
              allResults = [...allResults, ...results];
              hasMore = data.next !== null && results.length > 0;
              page++;
              if (page > 100) break;
            } catch (err) {
              break;
            }
          }

          return allResults;
        };

        const worksPromise = fetchAllPages(worksAPI.getAll, 50);
        const partsPromise = fetchAllPages(inventoryAPI.getAll, 50);
        const empResp = await employeesAPI.getAll();

        const works = await worksPromise;
        const parts = await partsPromise;
        
        setWorksList(works);
        setPartsList(parts);
        setEmployeesList(ensureArray(empResp));
    } catch (e) {
        message.error('Не вдалося завантажити довідники');
    }
  };

  const resolveNameInList = (id, list) => {
    if (!id || !Array.isArray(list)) return null;
    const item = list.find(el => String(el.id) === String(id));
    return item ? (item.name || item.username || `${item.first_name || ''} ${item.last_name || ''}`.trim()) : null;
  };

  const getSafeId = (obj) => {
    if (!obj) return null;
    return typeof obj === 'object' ? obj.id : obj;
  };

  const getSafeName = (obj, fallbackField = 'name') => {
    if (!obj) return '-';
    if (typeof obj === 'object') return obj[fallbackField] || obj.name || '-';
    return obj;
  };

  const getPhotoUrl = (photo) => {
    if (!photo) return null;
    if (typeof photo === 'string') return photo;
    return photo.url || photo.image || null;
  };

  const formatMileage = (mileage) => {
    if (!mileage) return '-';
    return `${Number(mileage).toLocaleString('uk-UA')} км`;
  };

  // Зміна статусу замовлення
  const handleStatusChange = async (newStatus) => {
    try {
      await ordersAPI.update(id, { status: newStatus });
      message.success('Статус змінено');
      initPage();
    } catch (error) {
      message.error('Помилка зміни статусу');
    }
  };

  const handleAddWork = async (values) => {
    setModalLoading(true);
    try {
      await ordersAPI.addWork(id, values);
      message.success('Роботу додано');
      setIsWorkModalOpen(false);
      formWork.resetFields();
      initPage();
    } catch (error) {
       const errorMsg = error.response?.data?.error || 'Помилка при додаванні роботи';
       message.error(errorMsg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddPart = async (values) => {
    setModalLoading(true);
    try {
      const workId = values.service_work;
      
      await ordersAPI.addPartToWork(workId, {
        part: values.part,
        quantity: values.quantity,
        unit_price: values.unit_price
      });
      
      message.success('Запчастину списано');
      setIsPartModalOpen(false);
      formPart.resetFields();
      initPage();
    } catch (error) {
       const errorMsg = error.response?.data?.error || error.response?.data?.detail || 'Помилка при списанні запчастини';
       message.error(errorMsg);
    } finally {
      setModalLoading(false);
    }
  };

  const onPartSelect = (partId) => {
    const safeList = ensureArray(partsList);
    const part = safeList.find(p => p.id === partId);
    if (part) {
        formPart.setFieldsValue({ unit_price: part.selling_price || part.price || 0 });
    }
  };

  const handleEditWork = (record) => {
    setEditingWork(record);
    formEditWork.setFieldsValue({
      work: record.work?.id || record.work,
      mechanic: record.mechanic?.id || record.mechanic,
      hours_spent: parseFloat(record.hours_spent) || 1,
      description: record.description || ''
    });
    setIsEditWorkModalOpen(true);
  };

  const handleSaveEditWork = async (values) => {
    if (!editingWork) return;
    
    setModalLoading(true);
    try {
      await ordersAPI.updateWork(editingWork.id, {
        work: values.work,
        mechanic: values.mechanic || null,
        hours_spent: values.hours_spent,
        description: values.description || ''
      });
      message.success('Роботу оновлено');
      setIsEditWorkModalOpen(false);
      setEditingWork(null);
      formEditWork.resetFields();
      initPage();
    } catch (error) {
      message.error('Помилка оновлення роботи');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteWork = (workId) => {
    Modal.confirm({
      title: 'Видалити роботу?',
      icon: <ExclamationCircleOutlined />,
      content: 'Ви впевнені, що хочете видалити цю роботу?',
      okText: 'Видалити',
      okType: 'danger',
      cancelText: 'Скасувати',
      onOk: async () => {
        try {
          await ordersAPI.removeWork(workId);
          message.success('Роботу видалено');
          initPage();
        } catch (error) {
          message.error('Помилка видалення роботи');
        }
      }
    });
  };

  const handleDeletePart = (workId, partId) => {
    Modal.confirm({
      title: 'Видалити запчастину?',
      icon: <ExclamationCircleOutlined />,
      content: 'Ви впевнені, що хочете видалити цю запчастину?',
      okText: 'Видалити',
      okType: 'danger',
      cancelText: 'Скасувати',
      onOk: async () => {
        try {
          await ordersAPI.removePartFromWork(workId, partId);
          message.success('Запчастину видалено');
          initPage();
        } catch (error) {
          message.error('Помилка видалення запчастини');
        }
      }
    });
  };

  if (loading) return <LoadingSpinner />;
  if (!order) return <div style={{padding: 20, textAlign: 'center'}}>Помилка: Немає даних замовлення</div>;

  const safeWorksList = ensureArray(worksList);
  const safeEmployeesList = ensureArray(employeesList);
  const safePartsList = ensureArray(partsList);
  
  const orderWorks = ensureArray(order.works);
  
  // Збираємо всі запчастини з усіх робіт
  const allUsedParts = orderWorks.flatMap(work => 
    (work.used_parts || []).map(part => ({
      ...part,
      work_id: work.id,
      work_name: work.work?.name || 'Невідома робота'
    }))
  );
  
  const isDeleted = order.marked_for_deletion;

  const carPhoto = getPhotoUrl(order.car_photo);
  const odometerPhoto = getPhotoUrl(order.odometer_photo);
  const dashboardPhoto = getPhotoUrl(order.dashboard_photo);
  const hasPhotos = carPhoto || odometerPhoto || dashboardPhoto;

  // Статуси для dropdown
  const statusItems = [
    { key: 'OPEN', label: 'Відкрито', icon: <ClockCircleOutlined /> },
    { key: 'IN_PROGRESS', label: 'В роботі', icon: <ToolOutlined /> },
    { key: 'DONE', label: 'Виконано', icon: <CheckCircleOutlined /> },
    { key: 'CLOSED', label: 'Закрито', icon: <CheckCircleOutlined /> },
  ];

  const worksColumns = [
    {
      title: 'Робота',
      dataIndex: 'work',
      key: 'work',
      render: (val) => {
        if (typeof val === 'object' && val !== null) {
          return val.name || '-';
        }
        return resolveNameInList(val, safeWorksList) || '-';
      },
    },
    {
      title: 'Виконавець',
      dataIndex: 'mechanic',
      key: 'mechanic',
      render: (val) => {
        if (typeof val === 'object' && val !== null) {
          return val.full_name || val.username || `${val.first_name} ${val.last_name}`.trim() || '-';
        }
        return resolveNameInList(val, safeEmployeesList) || '-';
      },
    },
    { 
      title: 'Годин', 
      dataIndex: 'hours_spent', 
      key: 'hours_spent',
      render: (val) => val || '-'
    },
    { 
      title: 'Вартість', 
      dataIndex: 'price_at_moment', 
      key: 'price_at_moment', 
      render: (val) => formatMoney(val) 
    },
    {
      title: 'Дії',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEditWork(record)}
            disabled={isDeleted}
          />
          <Button 
            type="link" 
            size="small" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteWork(record.id)}
            disabled={isDeleted}
          />
        </Space>
      ),
    },
  ];

  const partsColumns = [
    {
      title: 'Запчастина',
      dataIndex: 'part',
      key: 'part',
      render: (val) => {
          const partObj = typeof val === 'object' ? val : safePartsList.find(p => String(p.id) === String(val));
          if (!partObj) return typeof val === 'object' ? (val?.name || '-') : '-';
          return (
            <div>
                <div style={{ fontWeight: 500 }}>{partObj.name}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{partObj.sku_code || ''}</div>
            </div>
          );
      },
    },
    { 
      title: 'Кількість', 
      dataIndex: 'quantity', 
      key: 'quantity',
      render: (val) => val || '-'
    },
    { 
      title: 'Ціна', 
      dataIndex: 'unit_price', 
      key: 'unit_price', 
      render: (val) => formatMoney(val) 
    },
    { 
      title: 'Сума', 
      key: 'total', 
      render: (_, record) => formatMoney((parseFloat(record.unit_price) || 0) * (parseFloat(record.quantity) || 1)) 
    },
    {
      title: 'Робота',
      dataIndex: 'work_name',
      key: 'work_name',
      render: (val) => <span style={{ fontSize: '12px', color: '#666' }}>{val}</span>
    },
    {
      title: 'Дії',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button 
          type="link" 
          size="small" 
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeletePart(record.work_id, record.id)}
          disabled={isDeleted}
        />
      ),
    },
  ];

  const clientId = getSafeId(order.client);
  const truckId = getSafeId(order.truck);

  const tabItems = [
    {
      key: 'works',
      label: `Виконані роботи (${orderWorks.length})`,
      children: (
        <div>
            <Button 
                type="dashed" 
                icon={<PlusOutlined />} 
                onClick={() => setIsWorkModalOpen(true)} 
                disabled={isDeleted}
                style={{ marginBottom: 16, width: '100%' }}
            >
                Додати роботу
            </Button>
            <Table 
                columns={worksColumns} 
                dataSource={orderWorks} 
                rowKey={(r) => r.id || Math.random()} 
                pagination={false} 
                size="small" 
                bordered 
                locale={{ emptyText: 'Роботи не додано' }}
            />
        </div>
      ),
    },
    {
      key: 'parts',
      label: `Використані запчастини (${allUsedParts.length})`,
      children: (
        <div>
             <Button 
                type="dashed" 
                icon={<ToolOutlined />} 
                onClick={() => setIsPartModalOpen(true)} 
                disabled={isDeleted || orderWorks.length === 0}
                style={{ marginBottom: 16, width: '100%' }}
            >
                Списати запчастину
            </Button>
            {orderWorks.length === 0 && (
              <Alert 
                message="Спочатку додайте роботу" 
                description="Щоб списати запчастину, потрібно спочатку додати хоча б одну роботу до замовлення."
                type="info" 
                showIcon 
                style={{ marginBottom: 16 }}
              />
            )}
            <Table 
                columns={partsColumns} 
                dataSource={allUsedParts} 
                rowKey={(r) => r.id || Math.random()} 
                pagination={false} 
                size="small" 
                bordered 
                locale={{ emptyText: 'Запчастини не використано' }}
            />
        </div>
      ),
    },
    {
      key: 'photos',
      label: (
        <span>
          <CameraOutlined style={{ marginRight: 8 }} />
          Фото ({[carPhoto, odometerPhoto, dashboardPhoto].filter(Boolean).length})
        </span>
      ),
      children: (
        <div>
          {hasPhotos ? (
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card size="small" title="Фото авто" style={{ textAlign: 'center' }}>
                  {carPhoto ? (
                    <Image
                      src={carPhoto}
                      alt="Фото авто"
                      style={{ maxHeight: 200, objectFit: 'contain' }}
                      placeholder={<div style={{ padding: 20 }}>Завантаження...</div>}
                    />
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Немає фото" />
                  )}
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small" title="Фото одометра" style={{ textAlign: 'center' }}>
                  {odometerPhoto ? (
                    <Image
                      src={odometerPhoto}
                      alt="Фото одометра"
                      style={{ maxHeight: 200, objectFit: 'contain' }}
                      placeholder={<div style={{ padding: 20 }}>Завантаження...</div>}
                    />
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Немає фото" />
                  )}
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small" title="Фото панелі приладів" style={{ textAlign: 'center' }}>
                  {dashboardPhoto ? (
                    <Image
                      src={dashboardPhoto}
                      alt="Фото панелі приладів"
                      style={{ maxHeight: 200, objectFit: 'contain' }}
                      placeholder={<div style={{ padding: 20 }}>Завантаження...</div>}
                    />
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Немає фото" />
                  )}
                </Card>
              </Col>
            </Row>
          ) : (
            <Empty description="Фото не завантажено" />
          )}
        </div>
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
            <Dropdown 
              menu={{ 
                items: statusItems.map(item => ({
                  ...item,
                  onClick: () => handleStatusChange(item.key),
                  disabled: order.status === item.key
                }))
              }}
              disabled={isDeleted}
            >
              <Button>
                Змінити статус <DownOutlined />
              </Button>
            </Dropdown>
            <Button 
                type="primary" 
                icon={<EditOutlined />} 
                onClick={() => navigate(`/orders/${id}/edit`)}
                disabled={isDeleted}
            >
                Редагувати
            </Button>
          </Space>
        }
      />

      {isDeleted && (
        <Alert 
          message="Це замовлення позначено на видалення" 
          description={`Причина: ${order.deletion_reason || 'Не вказано'}. Позначив: ${order.marked_for_deletion_by_name || 'Невідомо'}`}
          type="error" 
          showIcon 
          style={{ marginBottom: 16 }}
        />
      )}

      <Card style={{ marginBottom: 16 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label="Номер">{order.order_number || '-'}</Descriptions.Item>
          <Descriptions.Item label="Статус">
            <Dropdown 
              menu={{ 
                items: statusItems.map(item => ({
                  ...item,
                  onClick: () => handleStatusChange(item.key),
                  disabled: order.status === item.key
                }))
              }}
              trigger={['click']}
              disabled={isDeleted}
            >
              <span style={{ cursor: isDeleted ? 'not-allowed' : 'pointer' }}>
                <StatusTag status={order.status} />
                {!isDeleted && <DownOutlined style={{ marginLeft: 4, fontSize: 10 }} />}
              </span>
            </Dropdown>
          </Descriptions.Item>
          <Descriptions.Item label="Сума">
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
              {formatMoney(order.total_cost)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Клієнт">
            {clientId ? (
              <Link to={`/clients/${clientId}`}>{getSafeName(order.client)}</Link>
            ) : getSafeName(order.client)}
          </Descriptions.Item>
          <Descriptions.Item label="Вантажівка">
            {truckId ? (
              <Link to={`/trucks/${truckId}`}>
                {order.truck?.license_plate || '-'}
              </Link>
            ) : (order.truck?.license_plate || '-')}
          </Descriptions.Item>
          <Descriptions.Item label="VIN (останні 7)">
            {order.truck?.last_seven_vin || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Пробіг">
            <span style={{ color: '#1890ff' }}>{formatMileage(order.current_mileage)}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Опис проблеми" span={2}>
            {order.problem_description || '-'}
          </Descriptions.Item>
          {order.recommendations && (
            <Descriptions.Item label="Рекомендації" span={3}>
              <div style={{ 
                background: '#fffbe6', 
                padding: '8px 12px', 
                borderRadius: 4,
                border: '1px solid #ffe58f'
              }}>
                {order.recommendations}
              </div>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card>
        <Tabs items={tabItems} defaultActiveKey="works" />
      </Card>

      {/* Модалка додавання роботи */}
      <Modal title="Додати роботу" open={isWorkModalOpen} onCancel={() => setIsWorkModalOpen(false)} footer={null} destroyOnClose>
        <Form form={formWork} layout="vertical" onFinish={handleAddWork}>
            <Form.Item name="work" label="Послуга" rules={[{ required: true, message: 'Оберіть послугу' }]}>
                 <Select 
                    showSearch 
                    placeholder="Оберіть послугу" 
                    optionFilterProp="label" 
                    options={safeWorksList.map(w => ({ value: w.id, label: w.name }))} 
                 />
            </Form.Item>
            <Form.Item name="employee" label="Механік">
                 <Select 
                    showSearch 
                    allowClear
                    placeholder="Оберіть механіка" 
                    optionFilterProp="label" 
                    options={safeEmployeesList.map(e => ({ value: e.id, label: e.full_name || e.username || `${e.first_name} ${e.last_name}`.trim() }))} 
                 />
            </Form.Item>
            <Form.Item name="hours" label="Витрачено годин" initialValue={1} rules={[{ required: true }]}>
                <InputNumber min={0.1} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={modalLoading} block>Зберегти</Button>
        </Form>
      </Modal>

      {/* Модалка списання запчастин */}
      <Modal title="Списати запчастину" open={isPartModalOpen} onCancel={() => setIsPartModalOpen(false)} footer={null} destroyOnClose width={500}>
        <Form form={formPart} layout="vertical" onFinish={handleAddPart}>
            {orderWorks.length > 0 ? (
              <Form.Item 
                name="service_work" 
                label="До якої роботи списати?" 
                rules={[{ required: true, message: 'Оберіть роботу' }]}
              >
                <Select 
                  placeholder="Оберіть роботу"
                  options={orderWorks.map(w => ({ 
                    value: w.id, 
                    label: w.work?.name || w.description || `Робота #${w.id}`
                  }))}
                />
              </Form.Item>
            ) : (
              <Alert 
                message="Спочатку додайте роботу" 
                description="Щоб списати запчастину, потрібно спочатку додати хоча б одну роботу до замовлення."
                type="warning" 
                showIcon 
                style={{ marginBottom: 16 }}
              />
            )}
            
            <Form.Item name="part" label="Запчастина" rules={[{ required: true, message: 'Оберіть запчастину' }]}>
                <Select 
                    showSearch 
                    placeholder="Пошук (Назва або Артикул)"
                    optionFilterProp="label"
                    onChange={onPartSelect}
                    options={safePartsList.map(p => ({ 
                        value: p.id, 
                        label: `${p.sku_code || ''} - ${p.name} (Склад: ${p.quantity || p.current_stock || 0})` 
                    }))}
                />
            </Form.Item>
            <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="quantity" label="Кількість" initialValue={1} rules={[{ required: true }]}>
                      <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="unit_price" label="Ціна за од." rules={[{ required: true }]}>
                      <InputNumber min={0} style={{ width: '100%' }} addonAfter="грн" />
                  </Form.Item>
                </Col>
            </Row>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={modalLoading} 
              block
              disabled={orderWorks.length === 0}
            >
              Списати
            </Button>
        </Form>
      </Modal>

      {/* Модалка редагування роботи */}
      <Modal 
        title="Редагувати роботу" 
        open={isEditWorkModalOpen} 
        onCancel={() => {
          setIsEditWorkModalOpen(false);
          setEditingWork(null);
          formEditWork.resetFields();
        }} 
        footer={null} 
        destroyOnClose
      >
        <Form form={formEditWork} layout="vertical" onFinish={handleSaveEditWork}>
            <Form.Item name="work" label="Послуга" rules={[{ required: true, message: 'Оберіть послугу' }]}>
                 <Select 
                    showSearch 
                    placeholder="Оберіть послугу" 
                    optionFilterProp="label" 
                    options={safeWorksList.map(w => ({ value: w.id, label: w.name }))} 
                 />
            </Form.Item>
            <Form.Item name="mechanic" label="Механік">
                 <Select 
                    showSearch 
                    allowClear
                    placeholder="Оберіть механіка" 
                    optionFilterProp="label" 
                    options={safeEmployeesList.map(e => ({ value: e.id, label: e.full_name || e.username || `${e.first_name} ${e.last_name}`.trim() }))} 
                 />
            </Form.Item>
            <Form.Item name="hours_spent" label="Витрачено годин" rules={[{ required: true }]}>
                <InputNumber min={0.1} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="description" label="Опис">
                <Input.TextArea rows={2} placeholder="Додатковий опис (необов'язково)" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={modalLoading} block>Зберегти зміни</Button>
        </Form>
      </Modal>
    </div>
  );
}

export default OrderDetailPage;
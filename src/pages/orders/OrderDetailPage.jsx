import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Table, message, Tabs, Space, Modal, Form, Select, InputNumber, Alert, Image, Row, Col, Empty, Input } from 'antd';
import { EditOutlined, PrinterOutlined, PlusOutlined, ToolOutlined, DeleteOutlined, ExclamationCircleOutlined, CameraOutlined } from '@ant-design/icons';
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
      console.error('CRITICAL ERROR loading order:', error);
      message.error('Не вдалося завантажити замовлення (можливо, воно видалене)');
    } finally {
      setLoading(false);
    }
  };

  const ensureArray = (input) => {
      if (!input) return [];
      if (Array.isArray(input)) return input;
      // Axios response: input.data.results
      if (input.data?.results && Array.isArray(input.data.results)) return input.data.results;
      // Axios response: input.data (якщо це масив)
      if (input.data && Array.isArray(input.data)) return input.data;
      // Пряма відповідь: input.results
      if (input.results && Array.isArray(input.results)) return input.results;
      return [];
  };

  const loadDirectories = async () => {
    try {
        // Функція для завантаження всіх сторінок
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
              
              // Перевіряємо чи є наступна сторінка
              hasMore = data.next !== null && results.length > 0;
              page++;
              
              // Обмеження: 3215 / 50 = ~65 сторінок
              if (page > 100) break;
            } catch (err) {
              console.error('Error fetching page:', page, err);
              break;
            }
          }
          
          console.log('Total loaded:', allResults.length);
          return allResults;
        };

        // Завантажуємо роботи та запчастини (всі сторінки)
        const worksPromise = fetchAllPages(worksAPI.getAll, 50);
        const partsPromise = fetchAllPages(inventoryAPI.getAll, 50);
        
        // Механіки - зазвичай їх мало
        const empResp = await employeesAPI.getAll();

        const works = await worksPromise;
        const parts = await partsPromise;
        
        setWorksList(works);
        setPartsList(parts);
        setEmployeesList(ensureArray(empResp));
        
        console.log('Works loaded:', works.length);
        console.log('Parts loaded:', parts.length);
        
    } catch (e) {
        console.error("Global directory error", e);
    }
  };

  // --- Хелпери ---
  const getSafeName = (entity, field = 'name') => {
      if (!entity) return '-';
      if (typeof entity === 'object') return entity[field] || '-';
      return entity;
  };

  const getSafeId = (entity) => {
     if (!entity) return null;
     if (typeof entity === 'object') return entity.id;
     return entity;
  };

  const resolveNameInList = (itemId, list, nameField = 'name') => {
    if (!itemId) return '-';
    if (typeof itemId === 'object') return itemId[nameField] || itemId.username || itemId.license_plate || '-';
    const safeList = ensureArray(list);
    const found = safeList.find(x => String(x.id) === String(itemId));
    return found ? (found[nameField] || found.username || found.license_plate) : itemId; 
  };

  // Форматування пробігу
  const formatMileage = (mileage) => {
    if (!mileage) return '-';
    return `${Number(mileage).toLocaleString('uk-UA')} км`;
  };

  // Отримання URL фото
  const getPhotoUrl = (photo) => {
    if (!photo) return null;
    if (typeof photo === 'string') {
      // Якщо це відносний шлях - додаємо базовий URL
      if (photo.startsWith('/')) {
        return `${window.location.origin}${photo}`;
      }
      return photo;
    }
    return null;
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
      console.error(error);
      message.error('Помилка додавання роботи');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddPart = async (values) => {
    setModalLoading(true);
    try {
      const workId = values.service_work;
      
      // Використовуємо новий ендпоінт add-part
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
       console.error(error);
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

  // Відкрити модалку редагування роботи
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

  // Зберегти зміни роботи
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
      console.error(error);
      message.error('Помилка оновлення роботи');
    } finally {
      setModalLoading(false);
    }
  };

  // Видалити роботу
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
          console.error(error);
          message.error('Помилка видалення роботи');
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
  const orderParts = ensureArray(order.parts || order.used_parts);
  
  // Перевірка на видалення
  const isDeleted = order.marked_for_deletion;

  // Фото
  const carPhoto = getPhotoUrl(order.car_photo);
  const odometerPhoto = getPhotoUrl(order.odometer_photo);
  const dashboardPhoto = getPhotoUrl(order.dashboard_photo);
  const hasPhotos = carPhoto || odometerPhoto || dashboardPhoto;

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
          if (!partObj) return typeof val === 'object' ? (val.name || val) : val;
          return (
            <div>
                <div style={{ fontWeight: 500 }}>{partObj.name}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{partObj.sku_code || ''}</div>
            </div>
          );
      },
    },
    { title: 'Кількість', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Ціна', dataIndex: 'price', key: 'price', render: (val) => formatMoney(val) },
    { title: 'Сума', key: 'total', render: (_, record) => formatMoney((record.price || 0) * (record.quantity || 1)) }
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
      label: `Використані запчастини (${orderParts.length})`,
      children: (
        <div>
             <Button 
                type="dashed" 
                icon={<ToolOutlined />} 
                onClick={() => setIsPartModalOpen(true)} 
                disabled={isDeleted}
                style={{ marginBottom: 16, width: '100%' }}
            >
                Списати запчастину
            </Button>
            <Table 
                columns={partsColumns} 
                dataSource={orderParts} 
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
            message="Увага! Це замовлення позначено на видалення"
            description={`Причина: ${order.deletion_reason || 'Не вказана'}. Редагування та додавання нових позицій заблоковано.`}
            type="error"
            showIcon
            icon={<DeleteOutlined />}
            style={{ marginBottom: 16 }}
          />
      )}

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered size="small">
          <Descriptions.Item label="Номер">
             <strong>{order.order_number || `#${order.id}`}</strong>
          </Descriptions.Item>
          
          <Descriptions.Item label="Статус">
             <StatusTag status={order.status} type="order" />
          </Descriptions.Item>
          
          <Descriptions.Item label="Сума">
             <strong style={{ color: '#52c41a' }}>{formatMoney(order.total_cost || 0)}</strong>
          </Descriptions.Item>
          
          <Descriptions.Item label="Клієнт">
            {clientId ? (
              <Link to={`/clients/${clientId}`}>
                {getSafeName(order.client, 'name')}
              </Link>
            ) : '-'}
          </Descriptions.Item>
          
          <Descriptions.Item label="Вантажівка">
             {truckId ? (
                <Link to={`/trucks/${truckId}`}>
                  {getSafeName(order.truck, 'license_plate')}
                </Link>
             ) : '-'}
          </Descriptions.Item>
          
          <Descriptions.Item label="VIN (останні 7)">
             {order.truck?.last_seven_vin || '-'}
          </Descriptions.Item>

          <Descriptions.Item label="Пробіг">
             <strong style={{ color: '#1890ff' }}>{formatMileage(order.current_mileage)}</strong>
          </Descriptions.Item>

          <Descriptions.Item label="Опис проблеми" span={2}>
             {order.problem_description || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      {/* --- МОДАЛКИ --- */}
      
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
                    placeholder="Оберіть механіка" 
                    optionFilterProp="label" 
                    options={safeEmployeesList.map(e => ({ value: e.id, label: e.name || e.username }))} 
                 />
            </Form.Item>
            <Form.Item name="hours" label="Годин" initialValue={1} rules={[{ required: true }]}>
                <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={modalLoading} block>Зберегти</Button>
        </Form>
      </Modal>

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
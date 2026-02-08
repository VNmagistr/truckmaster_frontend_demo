import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Table, message, Tabs, Space, Modal, Form, Select, InputNumber, Alert, Image, Row, Col, Empty } from 'antd';
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
  const [modalLoading, setModalLoading] = useState(false);

  const [worksList, setWorksList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [partsList, setPartsList] = useState([]);

  const [formWork] = Form.useForm();
  const [formPart] = Form.useForm();
  
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
      if (input.results && Array.isArray(input.results)) return input.results;
      if (input.data && Array.isArray(input.data)) return input.data;
      return [];
  };

  const loadDirectories = async () => {
    try {
        const [worksResp, empResp, partsResp] = await Promise.allSettled([
            worksAPI.getAll(),
            employeesAPI.getAll(),
            inventoryAPI.getAll({ page_size: 1000 })
        ]);

        const getValue = (result) => {
             if (result.status === 'fulfilled') return ensureArray(result.value);
             return [];
        };

        setWorksList(getValue(worksResp));
        setEmployeesList(getValue(empResp));
        setPartsList(getValue(partsResp));
        
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
      await ordersAPI.addPart(id, values);
      message.success('Запчастину додано');
      setIsPartModalOpen(false);
      formPart.resetFields();
      initPage();
    } catch (error) {
       const errorMsg = error.response?.data?.error || 'Помилка при додаванні запчастини';
       message.error(errorMsg);
    } finally {
      setModalLoading(false);
    }
  };

  const onPartSelect = (partId) => {
    const safeList = ensureArray(partsList);
    const part = safeList.find(p => p.id === partId);
    if (part) {
        formPart.setFieldsValue({ price: part.selling_price });
    }
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
      render: (val, record) => resolveNameInList(val, safeWorksList) || record.description || 'Без назви',
    },
    {
      title: 'Виконавець',
      dataIndex: 'employee',
      key: 'employee',
      render: (val) => resolveNameInList(val, safeEmployeesList),
    },
    { title: 'Годин', dataIndex: 'hours', key: 'hours' },
    { title: 'Вартість', dataIndex: 'amount', key: 'amount', render: (val) => formatMoney(val) },
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

      <Modal title="Списати запчастину" open={isPartModalOpen} onCancel={() => setIsPartModalOpen(false)} footer={null} destroyOnClose>
        <Form form={formPart} layout="vertical" onFinish={handleAddPart}>
            <Form.Item name="part" label="Запчастина" rules={[{ required: true, message: 'Оберіть запчастину' }]}>
                <Select 
                    showSearch 
                    placeholder="Пошук (Назва або Артикул)"
                    optionFilterProp="label"
                    onChange={onPartSelect}
                    options={safePartsList.map(p => ({ 
                        value: p.id, 
                        label: `${p.sku_code} - ${p.name} (Склад: ${p.quantity || p.current_stock || 0})` 
                    }))}
                />
            </Form.Item>
            <Space style={{ width: '100%' }}>
                <Form.Item name="quantity" label="К-сть" initialValue={1} rules={[{ required: true }]}>
                    <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="price" label="Ціна" rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Space>
            <Button type="primary" htmlType="submit" loading={modalLoading} block>Списати</Button>
        </Form>
      </Modal>
    </div>
  );
}

export default OrderDetailPage;
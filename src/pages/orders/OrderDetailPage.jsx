import React, { useState, useEffect, useRef } from 'react';
import { Card, Descriptions, Button, Table, message, Tabs, Space, Modal, Form, Select, InputNumber, Alert, Image, Row, Col, Empty, Input, Dropdown, Upload } from 'antd';
import { EditOutlined, PrinterOutlined, PlusOutlined, ToolOutlined, DeleteOutlined, ExclamationCircleOutlined, DownOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ordersAPI, worksAPI, employeesAPI, inventoryAPI, maintenanceAPI, repairPhotosAPI } from '../../api';
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

  const [isKitModalOpen, setIsKitModalOpen] = useState(false);
  const [kitData, setKitData] = useState(null);
  const [kitLoading, setKitLoading] = useState(false);
  const [kitWorkId, setKitWorkId] = useState(null);

  const [worksList, setWorksList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [partsList, setPartsList] = useState([]);
  const [partsSearchLoading, setPartsSearchLoading] = useState(false);
  const partsSearchTimer = useRef(null);

  const [formWork] = Form.useForm();
  const [formPart] = Form.useForm();
  const [formEditWork] = Form.useForm();

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceRules, setMaintenanceRules] = useState([]);
  const [maintenanceModalLoading, setMaintenanceModalLoading] = useState(false);
  const [formMaintenance] = Form.useForm();

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoFileList, setPhotoFileList] = useState([]);
  const [photoDescription, setPhotoDescription] = useState('');
  const [photoModalLoading, setPhotoModalLoading] = useState(false);

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
        const [worksResp, empResp] = await Promise.all([
            worksAPI.getAll({ page_size: 500 }),
            employeesAPI.getAll(),
        ]);
        const worksData = worksResp.data || worksResp;
        setWorksList(worksData.results || worksData || []);
        setEmployeesList(ensureArray(empResp));
    } catch (e) {
        message.error('Не вдалося завантажити довідники');
    }
  };

  const fetchParts = async (query = '') => {
    setPartsSearchLoading(true);
    try {
        const res = await inventoryAPI.getAll({ search: query, page_size: 20 });
        const data = res.data || res;
        setPartsList(data.results || []);
    } catch {
        // ignore
    } finally {
        setPartsSearchLoading(false);
    }
  };

  const handlePartsSearch = (query) => {
    clearTimeout(partsSearchTimer.current);
    if (query.length > 0 && query.length < 4) return;
    partsSearchTimer.current = setTimeout(() => fetchParts(query), 400);
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

  const handleUploadRepairPhoto = async () => {
    if (!photoFileList[0]?.originFileObj) return;
    setPhotoModalLoading(true);
    try {
      const formData = new FormData();
      formData.append('service_order', id);
      formData.append('image', photoFileList[0].originFileObj);
      if (photoDescription) formData.append('description', photoDescription);
      await repairPhotosAPI.upload(formData);
      message.success('Фото додано');
      setIsPhotoModalOpen(false);
      setPhotoFileList([]);
      setPhotoDescription('');
      initPage();
    } catch {
      message.error('Не вдалося завантажити фото');
    } finally {
      setPhotoModalLoading(false);
    }
  };

  const handleDeleteRepairPhoto = (photoId) => {
    Modal.confirm({
      title: 'Видалити фото?',
      icon: <ExclamationCircleOutlined />,
      okText: 'Видалити',
      okType: 'danger',
      cancelText: 'Скасувати',
      onOk: async () => {
        try {
          await repairPhotosAPI.delete(photoId);
          message.success('Фото видалено');
          initPage();
        } catch {
          message.error('Не вдалося видалити фото');
        }
      },
    });
  };

  const formatMileage = (mileage) => {
    if (!mileage) return '-';
    return `${Number(mileage).toLocaleString('uk-UA')} км`;
  };

  const handleOpenKitModal = async () => {
    const truckId = order?.truck?.id || order?.truck;
    if (!truckId) return message.warning('Авто не визначено');
    setKitLoading(true);
    setIsKitModalOpen(true);
    try {
      const res = await maintenanceAPI.getKit(truckId);
      const data = res.data || res;
      const list = Array.isArray(data) ? data : (data.results || []);
      setKitData(list.length > 0 ? list[0] : null);
    } catch {
      message.error('Не вдалося завантажити набір ТО');
      setIsKitModalOpen(false);
    } finally {
      setKitLoading(false);
    }
  };

  const handleAddKit = async () => {
    if (!kitWorkId) return message.warning('Оберіть роботу');
    setModalLoading(true);
    try {
      const res = await ordersAPI.applyKit(kitWorkId);
      const data = res.data || res;
      message.success(`Набір ТО додано: ${data.count} позиції`);
      setIsKitModalOpen(false);
      setKitWorkId(null);
      setKitData(null);
      initPage();
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.detail || 'Помилка при додаванні набору';
      message.error(msg);
    } finally {
      setModalLoading(false);
    }
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
      await ordersAPI.addWork(id, {
        service_order: id,
        work: values.work,
        mechanic: values.employee || null,
        hours_spent: values.hours,
      });
      message.success('Роботу додано');
      setIsWorkModalOpen(false);
      formWork.resetFields();
      initPage();
    } catch (error) {
       console.error('addWork error response:', error.response?.data);
       const data = error.response?.data;
       const errorMsg = data?.error || data?.detail || (typeof data === 'object' ? JSON.stringify(data) : null) || 'Помилка при додаванні роботи';
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

  const handleOpenMaintenanceModal = async () => {
    setIsMaintenanceModalOpen(true);
    setMaintenanceModalLoading(true);
    try {
      const res = await maintenanceAPI.getRules();
      const data = res.data || res;
      setMaintenanceRules(data.results || data || []);
    } catch {
      message.error('Не вдалося завантажити набори ТО');
    } finally {
      setMaintenanceModalLoading(false);
    }
  };

  const handleApplyMaintenanceSet = async (values) => {
    setMaintenanceModalLoading(true);
    try {
      await ordersAPI.applyMaintenanceSet(id, { rule_id: values.rule_id });
      message.success('Набір ТО застосовано');
      setIsMaintenanceModalOpen(false);
      formMaintenance.resetFields();
      initPage();
    } catch (error) {
      const detail = error.response?.data?.detail || 'Не вдалося застосувати набір ТО';
      message.error(detail);
    } finally {
      setMaintenanceModalLoading(false);
    }
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
  
  // Збираємо всі запчастини: з робіт + прямі (від набору ТО)
  const allUsedParts = [
    ...orderWorks.flatMap(work =>
      (work.used_parts || []).map(part => ({
        ...part,
        work_id: work.id,
        work_name: work.work?.name || work.description || 'Невідома робота',
      }))
    ),
    ...(order.direct_parts || []).map(part => ({
      ...part,
      work_id: null,
      work_name: 'ТО (набір)',
    })),
  ];
  
  const isDeleted = order.marked_for_deletion;

  const carPhoto = getPhotoUrl(order.car_photo);
  const odometerPhoto = getPhotoUrl(order.odometer_photo);
  const dashboardPhoto = getPhotoUrl(order.dashboard_photo);
  const repairPhotos = order.photos || [];

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
      render: (val, record) => {
        if (typeof val === 'object' && val !== null) {
          return val.name || record.description || '-';
        }
        return resolveNameInList(val, safeWorksList) || record.description || '-';
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
      render: (val) => (val != null && val !== '') ? val : '-'
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
      title: 'Артикул',
      key: 'part_sku',
      width: 110,
      render: (_, record) => record.part_sku || '-',
    },
    {
      title: 'Назва',
      key: 'part_name',
      render: (_, record) => record.part_name || '-',
    },
    {
      title: 'Бренд',
      key: 'part_brand',
      width: 120,
      render: (_, record) => record.part_brand || '-',
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
      render: (_, record) => record.work_id ? (
        <Button
          type="link"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeletePart(record.work_id, record.id)}
          disabled={isDeleted}
        />
      ) : null,
    },
  ];

  const clientId = getSafeId(order.client);
  const truckId = getSafeId(order.truck);

  const tabItems = [
    {
      key: 'works',
      label: `Роботи (${orderWorks.length})`,
      children: (
        <div>
            <Button
                type="dashed"
                icon={<ToolOutlined />}
                onClick={handleOpenMaintenanceModal}
                disabled={isDeleted}
                style={{ marginBottom: 8, width: '100%' }}
            >
                Додати набір для ТО
            </Button>
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
      label: `Запчастини (${allUsedParts.length})`,
      children: (
        <div>
             <Button
                type="dashed"
                icon={<ToolOutlined />}
                onClick={() => { setIsPartModalOpen(true); fetchParts(); }}
                disabled={isDeleted || orderWorks.length === 0}
                style={{ marginBottom: 8, width: '100%' }}
            >
                Списати запчастину
            </Button>
            <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleOpenKitModal}
                disabled={isDeleted || orderWorks.length === 0}
                style={{ marginBottom: 16, width: '100%' }}
            >
                Додати набір ТО
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
      key: 'car-photos',
      label: `Фото авто (${[carPhoto, odometerPhoto, dashboardPhoto].filter(Boolean).length})`,
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card size="small" title="Фото авто" style={{ textAlign: 'center' }}>
              {carPhoto ? (
                <Image src={carPhoto} alt="Фото авто" style={{ maxHeight: 200, objectFit: 'contain' }} />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Немає фото" />
              )}
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" title="Фото одометра" style={{ textAlign: 'center' }}>
              {odometerPhoto ? (
                <Image src={odometerPhoto} alt="Фото одометра" style={{ maxHeight: 200, objectFit: 'contain' }} />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Немає фото" />
              )}
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" title="Фото панелі приладів" style={{ textAlign: 'center' }}>
              {dashboardPhoto ? (
                <Image src={dashboardPhoto} alt="Фото панелі приладів" style={{ maxHeight: 200, objectFit: 'contain' }} />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Немає фото" />
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'repair-photos',
      label: `Фото ремонту (${repairPhotos.length})`,
      children: (
        <div>
          {!isDeleted && (
            <div style={{ marginBottom: 16 }}>
              <Button icon={<PlusOutlined />} onClick={() => setIsPhotoModalOpen(true)}>
                Додати фото
              </Button>
            </div>
          )}
          {repairPhotos.length > 0 ? (
            <Image.PreviewGroup>
              <Row gutter={[12, 12]}>
                {repairPhotos.map(photo => (
                  <Col xs={12} sm={8} md={6} key={photo.id}>
                    <Card
                      size="small"
                      cover={
                        <Image
                          src={photo.image}
                          alt={photo.description || 'Фото ремонту'}
                          style={{ height: 140, objectFit: 'cover' }}
                        />
                      }
                      actions={!isDeleted ? [
                        <DeleteOutlined
                          key="delete"
                          style={{ color: '#ff4d4f' }}
                          onClick={() => handleDeleteRepairPhoto(photo.id)}
                        />,
                      ] : []}
                    >
                      {photo.description && (
                        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                          {photo.description}
                        </div>
                      )}
                    </Card>
                  </Col>
                ))}
              </Row>
            </Image.PreviewGroup>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Немає фото з ремонту" />
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
                    placeholder="Назва або 4 останні цифри артикулу"
                    filterOption={false}
                    onSearch={handlePartsSearch}
                    loading={partsSearchLoading}
                    onChange={onPartSelect}
                    options={safePartsList.map(p => ({
                        value: p.id,
                        label: `${p.sku_code || ''} — ${p.name} (${p.current_stock || 0} ${p.unit || 'шт'})`,
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

      {/* Модалка набору ТО */}
      <Modal
        title="Набір ТО для авто"
        open={isKitModalOpen}
        onCancel={() => { setIsKitModalOpen(false); setKitWorkId(null); setKitData(null); }}
        footer={null}
        destroyOnClose
        width={520}
      >
        <Form layout="vertical">
          <Form.Item label="До якої роботи списати?" required>
            <Select
              placeholder="Оберіть роботу"
              value={kitWorkId}
              onChange={setKitWorkId}
              options={orderWorks.map(w => ({ value: w.id, label: w.work?.name || w.description || `Робота #${w.id}` }))}
            />
          </Form.Item>
        </Form>

        {kitLoading ? (
          <LoadingSpinner />
        ) : kitData === null ? (
          <Alert
            message="Набір ТО не знайдено"
            description="Для цього авто ще не збережено набір ТО. Додайте оливу та фільтри вручну — вони збережуться автоматично."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Table
            dataSource={[
              ...(kitData.oil ? [{
                key: 'oil',
                name: kitData.oil_name,
                sku: kitData.oil_sku,
                quantity: kitData.oil_quantity,
                type: 'Олива',
              }] : []),
              ...(kitData.filters || []).map(f => ({
                key: `filter-${f.id}`,
                name: f.part_name,
                sku: f.part_sku,
                quantity: f.quantity,
                type: f.filter_type?.name || 'Фільтр',
              })),
            ]}
            pagination={false}
            size="small"
            locale={{ emptyText: 'Набір порожній' }}
            columns={[
              { title: 'Назва', dataIndex: 'name', key: 'name' },
              { title: 'Артикул', dataIndex: 'sku', key: 'sku', width: 100 },
              { title: 'Тип', dataIndex: 'type', key: 'type', width: 100 },
              { title: 'К-сть', dataIndex: 'quantity', key: 'quantity', width: 70 },
            ]}
          />
        )}

        <Button
          type="primary"
          block
          style={{ marginTop: 16 }}
          loading={modalLoading}
          disabled={!kitWorkId || kitData === null}
          onClick={handleAddKit}
        >
          Списати весь набір
        </Button>
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

      {/* Модалка набору ТО */}
      <Modal
        title="Додати набір для ТО"
        open={isMaintenanceModalOpen}
        onCancel={() => { setIsMaintenanceModalOpen(false); formMaintenance.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form form={formMaintenance} layout="vertical" onFinish={handleApplyMaintenanceSet}>
          <Form.Item
            label="Набір ТО"
            name="rule_id"
            rules={[{ required: true, message: 'Оберіть набір' }]}
          >
            <Select
              placeholder="Оберіть регламент ТО"
              loading={maintenanceModalLoading}
              notFoundContent="Немає доступних наборів"
            >
              {maintenanceRules.map(r => (
                <Select.Option key={r.id} value={r.id}>
                  {r.rule_name || r.name || `Набір #${r.id}`}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={maintenanceModalLoading}
              block
            >
              Застосувати
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модалка завантаження фото з ремонту */}
      <Modal
        title="Додати фото з ремонту"
        open={isPhotoModalOpen}
        onCancel={() => { setIsPhotoModalOpen(false); setPhotoFileList([]); setPhotoDescription(''); }}
        footer={null}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Upload
            listType="picture-card"
            fileList={photoFileList}
            onChange={({ fileList }) => setPhotoFileList(fileList)}
            beforeUpload={() => false}
            maxCount={1}
            accept="image/*"
          >
            {photoFileList.length === 0 && (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>Вибрати фото</div>
              </div>
            )}
          </Upload>
        </div>
        <Input
          placeholder="Опис фото (необов'язково)"
          value={photoDescription}
          onChange={(e) => setPhotoDescription(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        <Button
          type="primary"
          loading={photoModalLoading}
          disabled={photoFileList.length === 0}
          onClick={handleUploadRepairPhoto}
          block
        >
          Завантажити
        </Button>
      </Modal>
    </div>
  );
}

export default OrderDetailPage;
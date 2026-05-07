import React, { useState, useEffect, useRef } from 'react';
import { Card, Descriptions, Button, Table, message, Tabs, Space, Modal, Form, Select, InputNumber, Alert, Image, Row, Col, Empty, Input, Dropdown, Upload, Typography } from 'antd';
const { Text } = Typography;
import { EditOutlined, FilePdfOutlined, PlusOutlined, ToolOutlined, DeleteOutlined, ExclamationCircleOutlined, DownOutlined, CheckCircleOutlined, ClockCircleOutlined, ScanOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ordersAPI, worksAPI, employeesAPI, inventoryAPI, maintenanceAPI, repairPhotosAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import BarcodeScanner from '../../components/BarcodeScanner';
import { formatMoney, formatDateTime } from '../../utils/formatters';

function OrderDetailPage() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [liveWorkPrice, setLiveWorkPrice] = useState(null);
  const [liveEditWorkPrice, setLiveEditWorkPrice] = useState(null);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
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

  const [countdown, setCountdown] = useState(null);
  const [countdownLoading, setCountdownLoading] = useState(false);

  const [editingRecommendations, setEditingRecommendations] = useState(false);
  const [recommendationsValue, setRecommendationsValue] = useState('');
  const [savingRecommendations, setSavingRecommendations] = useState(false);

  const [editingProblem, setEditingProblem] = useState(false);
  const [problemValue, setProblemValue] = useState('');
  const [savingProblem, setSavingProblem] = useState(false);

  const [editingOrderNumber, setEditingOrderNumber] = useState(false);
  const [orderNumberValue, setOrderNumberValue] = useState('');
  const [savingOrderNumber, setSavingOrderNumber] = useState(false);
  const orderNumberInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('works');
  const [statusHistory, setStatusHistory] = useState([]);
  const [statusHistoryLoading, setStatusHistoryLoading] = useState(false);

  const [pdfLoading, setPdfLoading] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    initPage();
  }, [id]);

  const pdfMenuItems = [
    { key: 'client', label: 'PDF для клієнта' },
    { key: 'mechanic', label: 'PDF для механіка' },
  ];

  const downloadPdf = async (type) => {
    setPdfLoading(true);
    try {
      const response = type === 'client'
        ? await ordersAPI.exportPdf(id)
        : await ordersAPI.getPdfMechanic(id);
      const orderNum = order?.order_number || id;
      const filename = type === 'client'
        ? `order_${orderNum}_client.pdf`
        : `order_${orderNum}_mechanic.pdf`;
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Не вдалося завантажити PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const initPage = async () => {
    setLoading(true);
    try {
      const response = await ordersAPI.getById(id);
      const data = response.data || response;
      
      if (!data) throw new Error("Дані замовлення відсутні");
      setOrder(data);

      loadDirectories();
      loadCountdown();
      loadStatusHistory();
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
    const files = photoFileList.filter(f => f.originFileObj);
    if (!files.length) return;
    setPhotoModalLoading(true);
    try {
      const formData = new FormData();
      formData.append('service_order', id);
      files.forEach(f => formData.append('images', f.originFileObj));
      if (photoDescription) formData.append('description', photoDescription);
      await repairPhotosAPI.bulkUpload(formData);
      message.success(files.length === 1 ? 'Фото додано' : `Додано фото: ${files.length}`);
      setIsPhotoModalOpen(false);
      setPhotoFileList([]);
      setPhotoDescription('');
      // Refresh order data without triggering full-page loading spinner (preserves active tab)
      try {
        const response = await ordersAPI.getById(id);
        setOrder(response.data || response);
      } catch { /* ignore refresh error */ }
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
          try {
            const response = await ordersAPI.getById(id);
            setOrder(response.data || response);
          } catch { /* ignore */ }
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

  const loadStatusHistory = async () => {
    setStatusHistoryLoading(true);
    try {
      const res = await ordersAPI.getStatusHistory(id);
      const data = res.data || res;
      setStatusHistory(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      message.error('Не вдалося завантажити історію статусів');
    } finally {
      setStatusHistoryLoading(false);
    }
  };

  const loadCountdown = async () => {
    if (!id) return;
    setCountdownLoading(true);
    try {
      const res = await ordersAPI.getMaintenanceCountdown(id);
      const data = res.data || res;
      setCountdown(data);
    } catch {
      // silent — block просто покаже прочерки
    } finally {
      setCountdownLoading(false);
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

  // Збереження номера наряду
  const handleSaveOrderNumber = async () => {
    setSavingOrderNumber(true);
    try {
      await ordersAPI.update(id, { order_number: orderNumberValue });
      setOrder(prev => ({ ...prev, order_number: orderNumberValue }));
      setEditingOrderNumber(false);
      message.success('Номер наряду збережено');
    } catch (error) {
      message.error('Помилка збереження номера наряду');
    } finally {
      setSavingOrderNumber(false);
    }
  };

  // Збереження опису проблеми
  const handleSaveProblem = async () => {
    setSavingProblem(true);
    try {
      await ordersAPI.update(id, { problem_description: problemValue });
      setOrder(prev => ({ ...prev, problem_description: problemValue }));
      setEditingProblem(false);
      message.success('Опис проблеми збережено');
    } catch (error) {
      message.error('Помилка збереження опису проблеми');
    } finally {
      setSavingProblem(false);
    }
  };

  // Збереження рекомендацій
  const handleSaveRecommendations = async () => {
    setSavingRecommendations(true);
    try {
      await ordersAPI.update(id, { recommendations: recommendationsValue });
      setOrder(prev => ({ ...prev, recommendations: recommendationsValue }));
      setEditingRecommendations(false);
      message.success('Рекомендації збережено');
    } catch (error) {
      message.error('Помилка збереження рекомендацій');
    } finally {
      setSavingRecommendations(false);
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
      const selectedWork = safeWorksList.find(w => w.id === values.work);
      const defaultName = selectedWork?.name || '';
      const customName = (values.custom_name || '').trim();
      await ordersAPI.addWork(id, {
        service_order: id,
        work: values.work,
        custom_name: customName && customName !== defaultName ? customName : '',
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

  const handleBarcodeDetected = async (code) => {
    setIsScannerOpen(false);
    try {
      const res = await inventoryAPI.getAll({ barcode: code, page_size: 1 });
      const results = (res.data?.results || res.data || []);
      if (results.length > 0) {
        const part = results[0];
        setPartsList([part]);
        formPart.setFieldsValue({
          part: part.id,
          unit_price: part.selling_price || 0,
        });
        message.success(`Знайдено: ${part.name}`);
      } else {
        message.warning(`Товар зі штрих-кодом "${code}" не знайдено. Спробуйте пошук вручну.`);
      }
    } catch {
      message.error('Помилка пошуку за штрих-кодом');
    }
  };

  const handleEditWork = (record) => {
    setEditingWork(record);
    const hours = parseFloat(record.hours_spent) || 1;
    const workId = record.work?.id || record.work;
    const catalogName = record.work?.name || safeWorksList.find(w => w.id === workId)?.name || '';
    formEditWork.setFieldsValue({
      work: workId,
      mechanic: record.mechanic?.id || record.mechanic,
      hours_spent: hours,
      custom_name: record.custom_name || catalogName,
      description: record.description || ''
    });
    // Живий розрахунок при відкритті
    const w = safeWorksList.find(x => x.id === workId);
    if (w) {
      const rate = parseFloat(w.hourly_rate) || 0;
      setLiveEditWorkPrice({ hours, rate, total: hours * rate });
    }
    setIsEditWorkModalOpen(true);
  };

  const handleSaveEditWork = async (values) => {
    if (!editingWork) return;

    setModalLoading(true);
    try {
      const selectedWork = safeWorksList.find(w => w.id === values.work);
      const defaultName = selectedWork?.name || '';
      const customName = (values.custom_name || '').trim();
      await ordersAPI.updateWork(editingWork.id, {
        work: values.work,
        custom_name: customName && customName !== defaultName ? customName : '',
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
        work_name: work.display_name || work.custom_name || work.work?.name || work.description || 'Невідома робота',
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
        if (record.display_name) return record.display_name;
        if (record.custom_name) return record.custom_name;
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
      key: 'amount',
      render: (_, record) => formatMoney(record.amount ?? record.price_at_moment),
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
                scroll={{ x: 'max-content' }}
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
                scroll={{ x: 'max-content' }}
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
      key: 'status-history',
      label: `Історія статусів (${statusHistory.length})`,
      children: (
        <Table
          dataSource={statusHistory}
          rowKey="id"
          pagination={false}
          size="small"
          loading={statusHistoryLoading}
          locale={{ emptyText: 'Немає змін статусу' }}
          columns={[
            {
              title: 'Дата і час',
              dataIndex: 'changed_at',
              key: 'changed_at',
              width: 160,
              render: (val) => val ? formatDateTime(val) : '-',
            },
            {
              title: 'Зі статусу',
              dataIndex: 'from_status',
              key: 'from_status',
              width: 140,
              render: (val) => val ? <StatusTag status={val} /> : <span style={{ color: '#999' }}>—</span>,
            },
            {
              title: 'На статус',
              dataIndex: 'to_status',
              key: 'to_status',
              width: 140,
              render: (val) => <StatusTag status={val} />,
            },
            {
              title: 'Хто змінив',
              dataIndex: 'changed_by_name',
              key: 'changed_by_name',
              render: (val) => val || '-',
            },
          ]}
        />
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
          <Space wrap>
            <Dropdown menu={{ items: pdfMenuItems, onClick: ({ key }) => downloadPdf(key) }}>
              <Button icon={<FilePdfOutlined />} loading={pdfLoading}>
                PDF <DownOutlined />
              </Button>
            </Dropdown>
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
        <Row gutter={0} style={{ alignItems: 'stretch' }}>
          {/* Ліва колонка: реквізити наряду та авто */}
          <Col xs={24} md={12} style={{ borderRight: '1px solid #f0f0f0', paddingRight: 0 }}>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Номер">
                {editingOrderNumber ? (
                  <Space.Compact>
                    <Input
                      ref={orderNumberInputRef}
                      size="small"
                      value={orderNumberValue}
                      onChange={e => setOrderNumberValue(e.target.value)}
                      onPressEnter={handleSaveOrderNumber}
                      onKeyDown={e => e.key === 'Escape' && setEditingOrderNumber(false)}
                      style={{ width: 160 }}
                    />
                    <Button type="primary" size="small" loading={savingOrderNumber} onClick={handleSaveOrderNumber}>Зберегти</Button>
                    <Button size="small" onClick={() => setEditingOrderNumber(false)}>Скасувати</Button>
                  </Space.Compact>
                ) : (
                  <Space size={4}>
                    <span>{order.order_number || '-'}</span>
                    {!isDeleted && (
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setOrderNumberValue(order.order_number || '');
                          setEditingOrderNumber(true);
                          setTimeout(() => orderNumberInputRef.current?.select(), 0);
                        }}
                      />
                    )}
                  </Space>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Клієнт">
                {clientId ? (
                  <Link to={`/clients/${clientId}`}>{getSafeName(order.client)}</Link>
                ) : getSafeName(order.client)}
              </Descriptions.Item>
              <Descriptions.Item label="Модель">
                {order.truck?.specific_model_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Держномер">
                {truckId ? (
                  <Link to={`/trucks/${truckId}`}>{order.truck?.license_plate || '-'}</Link>
                ) : (order.truck?.license_plate || '-')}
              </Descriptions.Item>
              <Descriptions.Item label="VIN (останні 7)">
                {order.truck?.last_seven_vin || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Пробіг">
                <span style={{ color: '#1890ff' }}>{formatMileage(order.current_mileage)}</span>
              </Descriptions.Item>
              {(order.engine_hours != null || /trakker/i.test(order.truck?.base_model_name || '')) && (
                <Descriptions.Item label="Мотогодини">
                  <span style={{ color: '#1890ff' }}>
                    {order.engine_hours != null ? `${Number(order.engine_hours).toLocaleString('uk').replace(/,/g, ' ')} мг` : '—'}
                  </span>
                </Descriptions.Item>
              )}
              {order.closed_at && (
                <Descriptions.Item label="Дата закриття">
                  {formatDateTime(order.closed_at)}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Col>

          {/* Права колонка: статус, проблема, рекомендації, сума */}
          <Col xs={24} md={12} className="order-detail-right-col">
            <Descriptions bordered column={1} size="small" className="order-detail-right-descriptions">
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
              <Descriptions.Item label="Опис проблеми">
                {editingProblem ? (
                  <div>
                    <Input.TextArea
                      autoFocus
                      rows={4}
                      value={problemValue}
                      style={{ marginBottom: 8 }}
                      onChange={(e) => setProblemValue(e.target.value)}
                      onFocus={() => {
                        if (!problemValue || problemValue.trim() === '') {
                          setProblemValue('- ');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const textarea = e.target;
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const value = textarea.value;
                          const newValue = value.substring(0, start) + '\n- ' + value.substring(end);
                          setProblemValue(newValue);
                          setTimeout(() => {
                            textarea.selectionStart = start + 3;
                            textarea.selectionEnd = start + 3;
                          }, 0);
                        }
                      }}
                    />
                    <Space>
                      <Button type="primary" size="small" loading={savingProblem} onClick={handleSaveProblem}>Зберегти</Button>
                      <Button size="small" onClick={() => setEditingProblem(false)}>Скасувати</Button>
                    </Space>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, whiteSpace: 'pre-wrap' }}>
                      {order.problem_description || <span style={{ color: '#bfbfbf' }}>—</span>}
                    </div>
                    {!isDeleted && (
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setProblemValue(order.problem_description || '');
                          setEditingProblem(true);
                        }}
                      />
                    )}
                  </div>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Рекомендації">
                {editingRecommendations ? (
                  <div>
                    <Input.TextArea
                      autoFocus
                      rows={4}
                      value={recommendationsValue}
                      style={{ backgroundColor: '#fffbe6', marginBottom: 8 }}
                      onChange={(e) => setRecommendationsValue(e.target.value)}
                      onFocus={() => {
                        if (!recommendationsValue || recommendationsValue.trim() === '') {
                          setRecommendationsValue('- ');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const textarea = e.target;
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const value = textarea.value;
                          const newValue = value.substring(0, start) + '\n- ' + value.substring(end);
                          setRecommendationsValue(newValue);
                          setTimeout(() => {
                            textarea.selectionStart = start + 3;
                            textarea.selectionEnd = start + 3;
                          }, 0);
                        }
                      }}
                    />
                    <Space>
                      <Button type="primary" size="small" loading={savingRecommendations} onClick={handleSaveRecommendations}>Зберегти</Button>
                      <Button size="small" onClick={() => setEditingRecommendations(false)}>Скасувати</Button>
                    </Space>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{
                      flex: 1,
                      background: '#fffbe6',
                      padding: '8px 12px',
                      borderRadius: 4,
                      border: '1px solid #ffe58f',
                      minHeight: 32,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {order.recommendations || <span style={{ color: '#bfbfbf' }}>—</span>}
                    </div>
                    {!isDeleted && (
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setRecommendationsValue(order.recommendations || '');
                          setEditingRecommendations(true);
                        }}
                      />
                    )}
                  </div>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Сума">
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                  {formatMoney(order.total_cost)}
                </span>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

      {/* Відлік регламентних робіт */}
      <Card
        title="Регламентні роботи"
        size="small"
        loading={countdownLoading}
        style={{ marginBottom: 16 }}
      >
        <Table
          dataSource={countdown?.items || []}
          rowKey="key"
          pagination={false}
          size="small"
          scroll={{ x: 600 }}
          style={{ maxWidth: 800 }}
          columns={[
            {
              title: 'Вид роботи',
              dataIndex: 'label',
              key: 'label',
            },
            {
              title: 'Інтервал',
              dataIndex: 'interval',
              key: 'interval',
              width: 120,
              render: (val) => val ? `${val.toLocaleString('uk-UA')} км` : '—',
            },
            {
              title: 'Остання заміна',
              dataIndex: 'last_km',
              key: 'last_km',
              width: 140,
              render: (val) => val ? `${val.toLocaleString('uk-UA')} км` : '—',
            },
            {
              title: 'Залишилось',
              dataIndex: 'remaining',
              key: 'remaining',
              width: 130,
              render: (val) => {
                if (val === null || val === undefined) return <span style={{ color: '#999' }}>Н/Д</span>;
                const color = val < 0 ? '#f5222d' : val < 5000 ? '#fa8c16' : '#52c41a';
                return <span style={{ color, fontWeight: 600 }}>{val.toLocaleString('uk-UA')} км</span>;
              },
            },
          ]}
        />
      </Card>

      <Card>
        <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />
      </Card>

      {/* Модалка додавання роботи */}
      <Modal
        title="Додати роботу"
        open={isWorkModalOpen}
        onCancel={() => { setIsWorkModalOpen(false); setLiveWorkPrice(null); }}
        footer={null}
        destroyOnClose
      >
        <Form form={formWork} layout="vertical" onFinish={handleAddWork}>
            <Form.Item name="work" label="Послуга з довідника" rules={[{ required: true, message: 'Оберіть послугу' }]}>
                 <Select
                    showSearch
                    placeholder="Оберіть послугу"
                    optionFilterProp="label"
                    options={safeWorksList.map(w => ({ value: w.id, label: w.name }))}
                    onSelect={(workId) => {
                      const w = safeWorksList.find(x => x.id === workId);
                      if (!w) return;
                      const hours = parseFloat(w.standard_hours) || 1;
                      const rate = parseFloat(w.hourly_rate) || 0;
                      formWork.setFieldsValue({ hours, custom_name: w.name });
                      setLiveWorkPrice({ hours, rate, total: hours * rate });
                    }}
                 />
            </Form.Item>
            <Form.Item
              name="custom_name"
              label="Назва роботи в наряді"
              tooltip="Можна відредагувати під конкретний наряд — довідник не зміниться"
            >
                <Input placeholder="Назва з довідника або власна" />
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
            <Form.Item name="hours" label="Кількість годин" rules={[{ required: true }]}>
                <InputNumber
                  min={0.1}
                  step={0.5}
                  style={{ width: '100%' }}
                  onChange={(val) => {
                    const workId = formWork.getFieldValue('work');
                    const w = safeWorksList.find(x => x.id === workId);
                    if (w && val) {
                      const rate = parseFloat(w.hourly_rate) || 0;
                      setLiveWorkPrice({ hours: val, rate, total: val * rate });
                    }
                  }}
                />
            </Form.Item>
            {liveWorkPrice && (
              <div style={{ background: '#f7f7f7', borderLeft: '4px solid #f5c518', padding: '6px 12px', borderRadius: 4, marginBottom: 16, fontSize: 13 }}>
                <Text type="secondary">{liveWorkPrice.hours} год × {formatMoney(liveWorkPrice.rate)}/год = </Text>
                <Text strong style={{ fontSize: 15 }}>{formatMoney(liveWorkPrice.total)}</Text>
              </div>
            )}
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
                    label: w.display_name || w.custom_name || w.work?.name || w.description || `Робота #${w.id}`
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
            
            <Form.Item name="part" label={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Запчастина
                <Button
                  size="small"
                  icon={<ScanOutlined />}
                  onClick={() => setIsScannerOpen(true)}
                  title="Сканувати штрих-код"
                >
                  Сканувати
                </Button>
              </span>
            } rules={[{ required: true, message: 'Оберіть запчастину' }]}>
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
          setLiveEditWorkPrice(null);
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={formEditWork} layout="vertical" onFinish={handleSaveEditWork}>
            <Form.Item name="work" label="Послуга з довідника" rules={[{ required: true, message: 'Оберіть послугу' }]}>
                 <Select
                    showSearch
                    placeholder="Оберіть послугу"
                    optionFilterProp="label"
                    options={safeWorksList.map(w => ({ value: w.id, label: w.name }))}
                    onSelect={(workId) => {
                      const w = safeWorksList.find(x => x.id === workId);
                      if (!w) return;
                      const hours = parseFloat(w.standard_hours) || 1;
                      const rate = parseFloat(w.hourly_rate) || 0;
                      formEditWork.setFieldsValue({ hours_spent: hours, custom_name: w.name });
                      setLiveEditWorkPrice({ hours, rate, total: hours * rate });
                    }}
                 />
            </Form.Item>
            <Form.Item
              name="custom_name"
              label="Назва роботи в наряді"
              tooltip="Можна відредагувати під конкретний наряд — довідник не зміниться"
            >
                <Input placeholder="Назва з довідника або власна" />
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
            <Form.Item name="hours_spent" label="Кількість годин" rules={[{ required: true }]}>
                <InputNumber
                  min={0.1}
                  step={0.5}
                  style={{ width: '100%' }}
                  onChange={(val) => {
                    const workId = formEditWork.getFieldValue('work');
                    const w = safeWorksList.find(x => x.id === workId);
                    if (w && val) {
                      const rate = parseFloat(w.hourly_rate) || 0;
                      setLiveEditWorkPrice({ hours: val, rate, total: val * rate });
                    }
                  }}
                />
            </Form.Item>
            {liveEditWorkPrice && (
              <div style={{ background: '#f7f7f7', borderLeft: '4px solid #f5c518', padding: '6px 12px', borderRadius: 4, marginBottom: 16, fontSize: 13 }}>
                <Text type="secondary">{liveEditWorkPrice.hours} год × {formatMoney(liveEditWorkPrice.rate)}/год = </Text>
                <Text strong style={{ fontSize: 15 }}>{formatMoney(liveEditWorkPrice.total)}</Text>
              </div>
            )}
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
            multiple
            accept="image/*"
          >
            <div>
              <PlusOutlined />
              <div style={{ marginTop: 8 }}>Вибрати фото</div>
            </div>
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
          {photoFileList.length > 1 ? `Завантажити ${photoFileList.length} фото` : 'Завантажити'}
        </Button>
      </Modal>

      <BarcodeScanner
        open={isScannerOpen}
        onDetected={handleBarcodeDetected}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
}

export default OrderDetailPage;
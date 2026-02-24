import React, { useState, useEffect, useMemo } from 'react';
import { Form, Input, Button, Card, message, Space, Select, Upload, Alert, Row, Col, Typography, Divider, Modal, DatePicker } from 'antd';
import { SaveOutlined, UploadOutlined, ExclamationCircleOutlined, CarOutlined, UserOutlined, CheckCircleOutlined, ToolOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { ordersAPI, clientsAPI, maintenanceAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import debounce from 'lodash/debounce';
import dayjs from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;

function OrderFormPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [clients, setClients] = useState([]);
  const [truckOptions, setTruckOptions] = useState([]); 
  const [searchingTrucks, setSearchingTrucks] = useState(false);
  
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [clientLocked, setClientLocked] = useState(false);
  const [lockedClientName, setLockedClientName] = useState('');
  
  const [alerts, setAlerts] = useState([]);
  const [carPhotoList, setCarPhotoList] = useState([]);
  const [odometerPhotoList, setOdometerPhotoList] = useState([]);
  const [dashboardPhotoList, setDashboardPhotoList] = useState([]);

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceRules, setMaintenanceRules] = useState([]);
  const [maintenanceModalLoading, setMaintenanceModalLoading] = useState(false);
  const [formMaintenance] = Form.useForm();
  
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  // Статуси замовлення
  const statusOptions = [
    { value: 'OPEN', label: 'Відкрито' },
    { value: 'IN_PROGRESS', label: 'В роботі' },
    { value: 'DONE', label: 'Виконано' },
    { value: 'CLOSED', label: 'Закрито' },
    { value: 'CANCELED', label: 'Скасовано' },
  ];

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const clientsResp = await clientsAPI.getAll({ page_size: 500 }).catch(() => ({ data: [] }));
        const clientsData = clientsResp.data || clientsResp;
        const clientsList = clientsData.results || clientsData || [];
        setClients(clientsList);

        if (isEdit) {
          const orderResp = await ordersAPI.getById(id);
          const orderData = orderResp.data || orderResp;

          if (orderData) {
            if (orderData.truck) {
              const initialTruck = {
                id: orderData.truck.id,
                license_plate: orderData.truck.license_plate,
                specific_model_name: orderData.truck.specific_model_name || orderData.truck.model,
                vin: orderData.truck.last_seven_vin,
                client_id: orderData.client?.id,
                client_name: orderData.client?.name
              };
              setTruckOptions([initialTruck]);
              setSelectedTruck(initialTruck);
              setClientLocked(true);
              setLockedClientName(orderData.client?.name || '');
            }

            form.setFieldsValue({
              order_number: orderData.order_number,
              truck: orderData.truck?.id || orderData.truck,
              client: orderData.client?.id || orderData.client,
              current_mileage: orderData.current_mileage,
              problem_description: orderData.problem_description,
              recommendations: orderData.recommendations,
              status: orderData.status,
              created_at: orderData.created_at ? dayjs(orderData.created_at) : null,
            });
            
            if (orderData.truck && orderData.current_mileage) {
              checkMaintenance(orderData.truck.id || orderData.truck, orderData.current_mileage);
            }

            if (orderData.car_photo) {
              setCarPhotoList([{ uid: 'car', name: 'car_photo', status: 'done', url: orderData.car_photo }]);
            }
            if (orderData.odometer_photo) {
              setOdometerPhotoList([{ uid: 'odometer', name: 'odometer_photo', status: 'done', url: orderData.odometer_photo }]);
            }
            if (orderData.dashboard_photo) {
              setDashboardPhotoList([{ uid: 'dashboard', name: 'dashboard_photo', status: 'done', url: orderData.dashboard_photo }]);
            }
          }
        }
      } catch (error) {
        message.error('Помилка завантаження даних');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [id, isEdit, form]);

  const handleSearchTruck = async (value) => {
    if (!value || value.length < 4) {
      setTruckOptions([]);
      return;
    }
    
    setSearchingTrucks(true);
    try {
      const res = await ordersAPI.searchTruck(value);
      const data = res.data || res;
      const results = data.results || data || [];
      setTruckOptions(results);
    } catch (error) {
      message.error('Помилка пошуку авто');
    } finally {
      setSearchingTrucks(false);
    }
  };

  const debouncedSearch = useMemo(() => debounce(handleSearchTruck, 600), []);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleTruckSelect = (truckId, option) => {
    const truckData = option.truck;
    
    if (truckData) {
      setSelectedTruck(truckData);
      
      if (truckData.client_id) {
        form.setFieldsValue({ client: truckData.client_id });
        setLockedClientName(truckData.client_name || '');
        setClientLocked(true);
      } else {
        form.setFieldsValue({ client: undefined });
        setLockedClientName('');
        setClientLocked(false);
        message.warning('У цього авто немає власника. Оберіть клієнта вручну.');
      }
    }
    
    setAlerts([]);
    
    const mileage = form.getFieldValue('current_mileage');
    if (mileage) {
      checkMaintenance(truckId, mileage);
    }
  };

  const handleTruckClear = () => {
    setSelectedTruck(null);
    setClientLocked(false);
    setLockedClientName('');
    form.setFieldsValue({ client: undefined });
    setAlerts([]);
    setTruckOptions([]);
  };

  const handleUnlockClient = () => {
    setClientLocked(false);
    setLockedClientName('');
  };

  const checkMaintenance = async (truckId, mileage) => {
    if (!truckId || !mileage) return;
    
    try {
      if (!ordersAPI.checkMaintenance) return;
      
      const res = await ordersAPI.checkMaintenance(truckId, mileage);
      const data = res.data || res;
      
      if (data && data.alerts && data.alerts.length > 0) {
        setAlerts(data.alerts);
      } else {
        setAlerts([]);
      }
    } catch (error) {
      // ігноруємо помилку перевірки регламентів — не критично
    }
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
      message.success('Набір ТО застосовано до наряду');
      setIsMaintenanceModalOpen(false);
      formMaintenance.resetFields();
    } catch (error) {
      const detail = error.response?.data?.detail || 'Не вдалося застосувати набір ТО';
      message.error(detail);
    } finally {
      setMaintenanceModalLoading(false);
    }
  };

  const compressImage = (file) => new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      (() => {
        let { width, height } = img;
        const maxDim = 1280;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
          else { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        // Перевірка що canvas не повернув порожній результат
        if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 100) {
          resolve(file);
          return;
        }
        // fetch надійніший за ручний atob на мобільних браузерах
        fetch(dataUrl)
          .then(r => r.blob())
          .then(blob => {
            if (blob.size < 1000) { resolve(file); return; }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          })
          .catch(() => resolve(file));
      })();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });

  const handleMileageBlur = (e) => {
    const mileage = e.target.value;
    const truckId = form.getFieldValue('truck');
    
    if (truckId && mileage) {
      checkMaintenance(truckId, mileage);
    }
  };

  const onFinish = async (values) => {
    setSaving(true);
    try {
      const formData = new FormData();

      // created_at приходить як dayjs-об'єкт — конвертуємо в ISO
      if (values.created_at) {
        values.created_at = values.created_at.toISOString();
      }

      Object.keys(values).forEach(key => {
        if (values[key] !== undefined && values[key] !== null) {
          formData.append(key, values[key]);
        }
      });

      const MAX_SIZE = 8 * 1024 * 1024; // 8MB

      const carFile = carPhotoList.find(f => f.originFileObj);
      if (carFile) {
        if (carFile.originFileObj.size > MAX_SIZE) { message.error('Фото авто занадто велике (макс. 8MB)'); setSaving(false); return; }
        formData.append('car_photo', carFile.originFileObj);
      }

      const odometerFile = odometerPhotoList.find(f => f.originFileObj);
      if (odometerFile) {
        if (odometerFile.originFileObj.size > MAX_SIZE) { message.error('Фото одометра занадто велике (макс. 8MB)'); setSaving(false); return; }
        formData.append('odometer_photo', odometerFile.originFileObj);
      }

      const dashboardFile = dashboardPhotoList.find(f => f.originFileObj);
      if (dashboardFile) {
        if (dashboardFile.originFileObj.size > MAX_SIZE) { message.error('Фото панелі занадто велике (макс. 8MB)'); setSaving(false); return; }
        formData.append('dashboard_photo', dashboardFile.originFileObj);
      }

      if (isEdit) {
        await ordersAPI.update(id, formData);
        message.success('Замовлення оновлено');
        navigate('/orders');
      } else {
        const res = await ordersAPI.create(formData);
        const created = res.data || res;
        message.success('Замовлення створено');
        navigate(`/orders/${created.id}`);
      }
    } catch (error) {
      const status = error.response?.status;
      const errorDetail = error.response?.data;
      if (status === 413) {
        message.error('Файл занадто великий. Спробуйте фото меншого розміру.');
      } else if (errorDetail && typeof errorDetail === 'object') {
        const messages = Object.entries(errorDetail)
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
          .join('; ');
        message.error(messages || 'Помилка збереження');
      } else {
        message.error('Помилка збереження замовлення');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Редагувати замовлення' : 'Нове замовлення'}
        showBack
      />

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card>
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ status: 'OPEN' }}
            >
              {/* Номер замовлення та Статус - тільки для редагування */}
              {isEdit && (
                <>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="order_number"
                        label="Номер замовлення"
                      >
                        <Input
                          size="large"
                          placeholder="SO-20260213-0001"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="status"
                        label="Статус"
                        rules={[{ required: true, message: 'Оберіть статус' }]}
                      >
                        <Select
                          size="large"
                          options={statusOptions}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Divider />
                </>
              )}

              {/* Дата створення */}
              <Form.Item name="created_at" label="Дата створення">
                <DatePicker
                  showTime={{ format: 'HH:mm' }}
                  format="DD.MM.YYYY HH:mm"
                  size="large"
                  style={{ width: '100%' }}
                  placeholder="Сьогодні за замовчуванням"
                />
              </Form.Item>

              {/* Пошук авто */}
              <Form.Item 
                name="truck" 
                label={
                  <Space>
                    <CarOutlined />
                    <span>Вантажівка (введіть номер для пошуку)</span>
                  </Space>
                }
                rules={[{ required: true, message: 'Оберіть вантажівку' }]}
              >
                <Select
                  showSearch
                  allowClear
                  placeholder="Введіть номер авто (мін. 2 символи)"
                  filterOption={false}
                  onSearch={debouncedSearch}
                  onSelect={handleTruckSelect}
                  onClear={handleTruckClear}
                  loading={searchingTrucks}
                  notFoundContent={searchingTrucks ? 'Пошук...' : 'Введіть номер авто'}
                  size="large"
                  optionLabelProp="label"
                >
                  {truckOptions.map(truck => {
                    const model = truck.specific_model_name || truck.model || 'Модель не вказана';
                    const shortLabel = `${truck.license_plate} — ${model}`;
                    return (
                      <Select.Option key={truck.id} value={truck.id} truck={truck} label={shortLabel}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <Text strong style={{ fontSize: '14px' }}>{truck.license_plate}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {model}
                            </Text>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              {truck.client_name || 'Без власника'}
                            </Text>
                          </div>
                        </div>
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>

              {/* Інформація про вибране авто */}
              {selectedTruck && (
                <Card 
                  size="small" 
                  style={{ marginBottom: 16, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}
                >
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text type="secondary">Номер:</Text>
                      <br />
                      <Text strong style={{ fontSize: '16px' }}>{selectedTruck.license_plate}</Text>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Модель:</Text>
                      <br />
                      <Text>{selectedTruck.specific_model_name || selectedTruck.model || '-'}</Text>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">VIN (останні 7):</Text>
                      <br />
                      <Text>{selectedTruck.vin || selectedTruck.last_seven_vin || '-'}</Text>
                    </Col>
                  </Row>
                </Card>
              )}

              {/* Власник (клієнт) - приховане поле для форми */}
              <Form.Item 
                name="client" 
                hidden={clientLocked}
                rules={[{ required: true, message: 'Оберіть власника' }]}
              >
                <Select>
                  {clients.map(c => (
                    <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Відображення власника */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  <Space>
                    <UserOutlined />
                    <span>Власник</span>
                    {clientLocked && <Text type="success">(визначено автоматично)</Text>}
                  </Space>
                </label>
                
                {clientLocked ? (
                  <div 
                    style={{ 
                      padding: '8px 12px', 
                      border: '1px solid #d9d9d9', 
                      borderRadius: '8px',
                      backgroundColor: '#f5f5f5',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: '40px'
                    }}
                  >
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <Text strong>{lockedClientName || 'Власник'}</Text>
                    </Space>
                    <Button 
                      type="link" 
                      size="small" 
                      onClick={handleUnlockClient}
                    >
                      Змінити
                    </Button>
                  </div>
                ) : (
                  <Select 
                    showSearch 
                    placeholder="Оберіть власника"
                    optionFilterProp="children"
                    size="large"
                    value={form.getFieldValue('client')}
                    onChange={(value) => form.setFieldsValue({ client: value })}
                    filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    style={{ width: '100%' }}
                  >
                    {clients.map(c => (
                      <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                    ))}
                  </Select>
                )}
              </div>

              <Divider />

              {/* Пробіг */}
              <Form.Item 
                name="current_mileage" 
                label="Поточний пробіг" 
                rules={[{ required: true, message: 'Вкажіть пробіг' }]}
              >
                <Input 
                  type="number" 
                  onBlur={handleMileageBlur} 
                  suffix="км" 
                  size="large"
                  placeholder="Наприклад: 450000"
                  min={0}
                />
              </Form.Item>

              {/* Алерти про регламенти */}
              {alerts.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  {alerts.map((alert, idx) => (
                    <Alert
                      key={idx}
                      message={alert.message || alert.rule_name}
                      type={alert.message?.includes('Прострочено') ? 'error' : 'warning'}
                      showIcon
                      icon={<ExclamationCircleOutlined />}
                      style={{ marginBottom: 8 }}
                    />
                  ))}
                  {isEdit && (
                    <Button
                      type="primary"
                      icon={<ToolOutlined />}
                      onClick={handleOpenMaintenanceModal}
                      style={{ marginTop: 8 }}
                    >
                      Застосувати набір для ТО
                    </Button>
                  )}
                </div>
              )}

              <Divider />

              {/* Фото */}
              <Form.Item label="Фотофіксація">
                <Row gutter={[12, 12]}>
                  <Col xs={24} sm={8}>
                    <div style={{ marginBottom: 4 }}><Text type="secondary">Фото авто</Text></div>
                    <Upload listType="picture-card" fileList={carPhotoList}
                      onChange={({ fileList }) => setCarPhotoList(fileList)}
                      beforeUpload={() => false} maxCount={1} accept="image/*">
                      {carPhotoList.length === 0 && (
                        <div><UploadOutlined /><div style={{ marginTop: 8 }}>Авто</div></div>
                      )}
                    </Upload>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div style={{ marginBottom: 4 }}><Text type="secondary">Фото одометра</Text></div>
                    <Upload listType="picture-card" fileList={odometerPhotoList}
                      onChange={({ fileList }) => setOdometerPhotoList(fileList)}
                      beforeUpload={() => false} maxCount={1} accept="image/*">
                      {odometerPhotoList.length === 0 && (
                        <div><UploadOutlined /><div style={{ marginTop: 8 }}>Одометр</div></div>
                      )}
                    </Upload>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div style={{ marginBottom: 4 }}><Text type="secondary">Фото панелі</Text></div>
                    <Upload listType="picture-card" fileList={dashboardPhotoList}
                      onChange={({ fileList }) => setDashboardPhotoList(fileList)}
                      beforeUpload={() => false} maxCount={1} accept="image/*">
                      {dashboardPhotoList.length === 0 && (
                        <div><UploadOutlined /><div style={{ marginTop: 8 }}>Панель</div></div>
                      )}
                    </Upload>
                  </Col>
                </Row>
              </Form.Item>

              {/* Опис проблеми */}
              <Form.Item name="problem_description" label="Опис проблеми / скарги клієнта">
                <TextArea 
                  rows={3} 
                  placeholder="Опишіть проблему або скарги клієнта..."
                />
              </Form.Item>

              {/* Рекомендації */}
              <Form.Item 
                name="recommendations" 
                label={
                  <Space>
                    <span>Рекомендації</span>
                    <Text type="secondary">(після діагностики)</Text>
                  </Space>
                }
              >
                <TextArea 
                  rows={3} 
                  placeholder="Перелік виявлених проблем та рекомендації щодо ремонту..."
                  style={{ backgroundColor: '#fffbe6' }}
                />
              </Form.Item>

              {/* Кнопки */}
              <Form.Item>
                <Space size="middle">
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={saving} 
                    icon={<SaveOutlined />}
                    size="large"
                  >
                    {isEdit ? 'Зберегти зміни' : 'Створити замовлення'}
                  </Button>
                  <Button onClick={() => navigate('/orders')} size="large">
                    Скасувати
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Бічна панель з підказками */}
        <Col xs={24} lg={8}>
          <Card title="Як створити замовлення" size="small">
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              <li style={{ marginBottom: 12 }}>
                <Text strong>Введіть номер авто</Text>
                <br />
                <Text type="secondary">Мінімум 2 символи для пошуку</Text>
              </li>
              <li style={{ marginBottom: 12 }}>
                <Text strong>Оберіть авто зі списку</Text>
                <br />
                <Text type="secondary">Власник підставиться автоматично</Text>
              </li>
              <li style={{ marginBottom: 12 }}>
                <Text strong>Вкажіть пробіг</Text>
                <br />
                <Text type="secondary">Система перевірить регламенти ТО</Text>
              </li>
              <li style={{ marginBottom: 12 }}>
                <Text strong>Додайте фото та опис</Text>
                <br />
                <Text type="secondary">Фото авто, одометра, панелі</Text>
              </li>
              <li>
                <Text strong>Заповніть рекомендації</Text>
                <br />
                <Text type="secondary">Після діагностики вкажіть виявлені проблеми</Text>
              </li>
            </ol>
          </Card>

          {isEdit && (
            <Card title="Статуси замовлення" size="small" style={{ marginTop: 16 }}>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li><Text strong>Відкрито</Text> — нове замовлення</li>
                <li><Text strong>В роботі</Text> — ведуться роботи</li>
                <li><Text strong>Виконано</Text> — роботи завершені</li>
                <li><Text strong>Закрито</Text> — замовлення закрите</li>
                <li><Text strong>Скасовано</Text> — замовлення скасовано</li>
              </ul>
            </Card>
          )}
        </Col>
      </Row>

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
    </div>
  );
}

export default OrderFormPage;
import React, { useState, useEffect, useMemo } from 'react';
import { Form, Input, Button, Card, message, Space, Select, Upload, Alert, Row, Col, Typography, Spin } from 'antd';
import { SaveOutlined, UploadOutlined, ExclamationCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { ordersAPI, clientsAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import debounce from 'lodash/debounce';

function OrderFormPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [clients, setClients] = useState([]);
  const [truckOptions, setTruckOptions] = useState([]); 
  const [searchingTrucks, setSearchingTrucks] = useState(false);
  
  const [alerts, setAlerts] = useState([]);
  const [fileList, setFileList] = useState([]);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  useEffect(() => {
    initPage();
  }, [id]);

  const initPage = async () => {
    setLoading(true);
    try {
      // 1. Вантажимо список клієнтів (перші 100)
      const clientsResp = await clientsAPI.getAll({ page_size: 100 });
      const clientsData = clientsResp.data || clientsResp;
      const initialClients = clientsData.results || clientsData || [];
      setClients(initialClients);

      // 2. Якщо редагування - вантажимо замовлення
      if (isEdit) {
        const orderResp = await ordersAPI.getById(id);
        const orderData = orderResp.data || orderResp;

        // --- ЛОГІКА ДЛЯ КОРЕКТНОГО ВІДОБРАЖЕННЯ SELECT ---
        
        // Вантажівка: додаємо поточну в список опцій
        if (orderData.truck) {
             const t = orderData.truck;
             // Формуємо об'єкт для Select
             const truckOption = {
                 id: t.id,
                 license_plate: t.license_plate,
                 specific_model_name: t.specific_model_name,
                 client_name: t.client?.name || orderData.client?.name
             };
             setTruckOptions([truckOption]);
        }

        // Клієнт: перевіряємо, чи є він в списку, якщо ні - довантажуємо
        const clientId = orderData.client?.id || orderData.client;
        if (clientId && !initialClients.find(c => c.id === clientId)) {
            try {
                const clientResp = await clientsAPI.getById(clientId);
                const clientObj = clientResp.data || clientResp;
                setClients(prev => [...prev, clientObj]);
            } catch (e) { console.error("Missing client fetch error", e); }
        }

        // Заповнюємо форму
        form.setFieldsValue({
          ...orderData,
          client: clientId,
          truck: orderData.truck?.id || orderData.truck,
          current_mileage: orderData.current_mileage
        });
        
        // Перевірка регламенту
        if (orderData.truck && orderData.current_mileage) {
            checkMaintenance(orderData.truck.id || orderData.truck, orderData.current_mileage);
        }
      }
    } catch (error) {
      console.error('Init error:', error);
      message.error('Помилка ініціалізації сторінки');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchTruck = async (value) => {
      if (!value || value.length < 2) return; 
      setSearchingTrucks(true);
      try {
          const res = await ordersAPI.searchTruck(value);
          // Бекенд повертає { results: [...] } або відразу масив
          const data = res.data || res;
          setTruckOptions(data.results || data || []);
      } catch (error) {
          console.error("Пошук авто:", error);
      } finally {
          setSearchingTrucks(false);
      }
  };

  const debouncedSearch = useMemo(() => debounce(handleSearchTruck, 600), []);

  const handleTruckSelect = (truckId, option) => {
      const truckData = option.item;
      if (truckData && truckData.client) {
          // Якщо в об'єкті вантажівки є ID клієнта, підставляємо його
          const cid = typeof truckData.client === 'object' ? truckData.client.id : truckData.client;
          form.setFieldsValue({ client: cid });
          
          // Якщо цього клієнта немає в списку, треба б його довантажити, 
          // але для спрощення поки просто встановимо ID.
      }
      setAlerts([]);
      const mileage = form.getFieldValue('current_mileage');
      if (mileage) checkMaintenance(truckId, mileage);
  };

  const checkMaintenance = async (truckId, mileage) => {
      if (!truckId || !mileage) return;
      try {
          const res = await ordersAPI.checkMaintenance ? ordersAPI.checkMaintenance(truckId, mileage) : { data: {} };
          if (res.data && res.data.alerts) setAlerts(res.data.alerts);
      } catch (error) { console.error("Check failed", error); }
  };

  const handleMileageChange = (e) => {
      const mileage = e.target.value;
      const truckId = form.getFieldValue('truck');
      if (truckId && mileage) {
          const timer = setTimeout(() => checkMaintenance(truckId, mileage), 800);
          return () => clearTimeout(timer);
      }
  };

  const handleFileChange = ({ fileList: newFileList }) => setFileList(newFileList);

  const onFinish = async (values) => {
    setSaving(true);
    try {
      const formData = new FormData();
      Object.keys(values).forEach(key => {
        if (values[key] !== undefined && values[key] !== null) {
            formData.append(key, values[key]);
        }
      });

      fileList.forEach((file, index) => {
          if (file.originFileObj) {
              if (index === 0) formData.append('car_photo', file.originFileObj);
              else if (index === 1) formData.append('odometer_photo', file.originFileObj);
              else if (index === 2) formData.append('dashboard_photo', file.originFileObj);
          }
      });

      if (isEdit) {
        await ordersAPI.update(id, formData);
        message.success('Замовлення оновлено!');
      } else {
        await ordersAPI.create(formData);
        message.success('Замовлення створено!');
      }
      navigate('/orders');
    } catch (error) {
      console.error('Save error:', error);
      message.error('Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={isEdit ? `Замовлення #${id}` : 'Нове замовлення'} showBack />
      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card>
            <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ status: 'OPEN' }}>
              
              <Form.Item name="truck" label="Автомобіль (Введіть номер)" rules={[{ required: true, message: 'Оберіть авто' }]}>
                <Select
                    showSearch
                    placeholder="Введіть номер..."
                    filterOption={false}
                    onSearch={debouncedSearch}
                    onSelect={handleTruckSelect}
                    notFoundContent={searchingTrucks ? <Spin size="small" /> : null}
                    allowClear
                    suffixIcon={<SearchOutlined />}
                >
                    {truckOptions.map(t => (
                        <Select.Option key={t.id} value={t.id} item={t}>
                            {t.license_plate} <span style={{color:'#999'}}>({t.specific_model_name})</span>
                        </Select.Option>
                    ))}
                </Select>
              </Form.Item>

              <Form.Item name="client" label="Клієнт" rules={[{ required: true }]}>
                <Select showSearch placeholder="Оберіть клієнта" optionFilterProp="children">
                  {clients.map(c => (
                    <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="current_mileage" label="Пробіг" rules={[{ required: true }]}>
                <Input type="number" onChange={handleMileageChange} suffix="км" />
              </Form.Item>

              {alerts.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                      {alerts.map((alert, idx) => (
                          <Alert key={idx} message={alert.message} type="error" showIcon icon={<ExclamationCircleOutlined />} style={{ marginBottom: 5 }} />
                      ))}
                  </div>
              )}

              <Form.Item label="Фотофіксація">
                <Upload listType="picture-card" fileList={fileList} onChange={handleFileChange} beforeUpload={() => false} maxCount={3}>
                    {fileList.length < 3 && <div><UploadOutlined /><div style={{ marginTop: 8 }}>Фото</div></div>}
                </Upload>
              </Form.Item>

              <Form.Item name="problem_description" label="Опис проблеми">
                <Input.TextArea rows={4} />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>Зберегти</Button>
                  <Button onClick={() => navigate('/orders')}>Скасувати</Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default OrderFormPage;
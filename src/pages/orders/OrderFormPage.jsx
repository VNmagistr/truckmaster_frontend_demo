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
    const initData = async () => {
      setLoading(true);
      try {
        // 1. Вантажимо клієнтів
        const clientsResp = await clientsAPI.getAll({ page_size: 100 }).catch(() => []);
        // 🔥 ВИПРАВЛЕННЯ: Розпаковка .data
        const clientsData = clientsResp.data || clientsResp;
        setClients(clientsData.results || clientsData || []);

        // 2. Якщо редагування - вантажимо замовлення
        if (isEdit) {
          const orderResp = await ordersAPI.getById(id);
          // 🔥 ВИПРАВЛЕННЯ: Розпаковка .data
          const orderData = orderResp.data || orderResp;

          if (orderData) {
            if (orderData.truck) {
                const initialTruck = {
                    id: orderData.truck.id,
                    license_plate: orderData.truck.license_plate,
                    specific_model_name: orderData.truck.specific_model_name,
                    client_name: orderData.client?.name
                };
                setTruckOptions([initialTruck]);
            }

            form.setFieldsValue({
              ...orderData,
              client: orderData.client?.id || orderData.client,
              truck: orderData.truck?.id || orderData.truck,
              current_mileage: orderData.current_mileage
            });
            
            if (orderData.truck && orderData.current_mileage) {
               checkMaintenance(orderData.truck.id || orderData.truck, orderData.current_mileage);
            }
          }
        }
      } catch (error) {
        console.error('Init error:', error);
        message.error('Помилка завантаження даних');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [id, isEdit, form]);

  const handleSearchTruck = async (value) => {
      if (!value || value.length < 2) return; 
      setSearchingTrucks(true);
      try {
          const res = await ordersAPI.searchTruck(value);
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
           // Обробка вкладеного об'єкта client або client_id
          const cid = typeof truckData.client === 'object' ? truckData.client.id : (truckData.client || truckData.client_id);
          if (cid) form.setFieldsValue({ client: cid });
      }
      setAlerts([]);
      const mileage = form.getFieldValue('current_mileage');
      if (mileage) checkMaintenance(truckId, mileage);
  };

  const checkMaintenance = async (truckId, mileage) => {
      if (!truckId || !mileage) return;
      try {
          // Перевірка на існування методу
          if (!ordersAPI.checkMaintenance) return;
          
          const res = await ordersAPI.checkMaintenance(truckId, mileage);
          const data = res.data || res;
          
          if (data && data.alerts) {
              setAlerts(data.alerts);
          }
      } catch (error) {
          console.error("Reglament check failed", error);
      }
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
              
              <Form.Item
                name="truck"
                label="Автомобіль (Введіть номер)"
                rules={[{ required: true, message: 'Оберіть авто' }]}
              >
                <Select
                    showSearch
                    placeholder="Введіть номер (напр. 1234)..."
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
import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Table, message, Tabs, Space, Modal, Form, Select, InputNumber } from 'antd';
import { EditOutlined, PrinterOutlined, PlusOutlined, ToolOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ordersAPI, worksAPI, employeesAPI, inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatMoney } from '../../utils/formatters';

// Тестові дані на випадок збою API
const MOCK_WORKS = [
  { id: 1, name: 'Діагностика ходової' },
  { id: 2, name: 'Заміна оливи' },
  { id: 3, name: 'Комп\'ютерна діагностика' },
];

const MOCK_EMPLOYEES = [
  { id: 1, name: 'Механік 1' },
  { id: 2, name: 'Механік 2' },
];

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
      // 🔥 ВИПРАВЛЕННЯ: Розпаковка даних. Без цього сторінка падає.
      setOrder(response.data || response);

      // Вантажівмо довідники
      loadDirectories();
    } catch (error) {
      console.error('Error loading order:', error);
      message.error('Не вдалося завантажити замовлення');
      navigate('/orders'); // Якщо замовлення немає - повертаємось назад
    } finally {
      setLoading(false);
    }
  };

  const loadDirectories = async () => {
    try {
        // Використовуємо Promise.allSettled або окремі catch, щоб одна помилка не вбила все
        const worksResp = await worksAPI.getAll().catch(() => ({ data: [] }));
        const worksData = worksResp.data || worksResp;
        setWorksList(Array.isArray(worksData) ? worksData : (worksData.results || MOCK_WORKS));
        
        const empResp = await employeesAPI.getAll().catch(() => ({ data: [] }));
        const empData = empResp.data || empResp;
        setEmployeesList(Array.isArray(empData) ? empData : (empData.results || MOCK_EMPLOYEES));

        const partsResp = await inventoryAPI.getAll({ page_size: 1000 }).catch(() => ({ data: [] }));
        const partsData = partsResp.data || partsResp;
        setPartsList(partsData.results || partsData || []);
    } catch (e) {
        console.warn("Directories fetch warning", e);
    }
  };

  const handleAddWork = async (values) => {
    setModalLoading(true);
    try {
      await ordersAPI.addWork(id, values);
      message.success('Роботу додано');
      setIsWorkModalOpen(false);
      formWork.resetFields();
      
      const updated = await ordersAPI.getById(id);
      setOrder(updated.data || updated);
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
      
      const updated = await ordersAPI.getById(id);
      setOrder(updated.data || updated);
    } catch (error) {
       const errorMsg = error.response?.data?.error || 'Помилка при додаванні запчастини';
       message.error(errorMsg);
    } finally {
      setModalLoading(false);
    }
  };

  const onPartSelect = (partId) => {
    const part = partsList.find(p => p.id === partId);
    if (part) {
        formPart.setFieldsValue({ price: part.selling_price });
    }
  };

  const getName = (item, list, nameField = 'name') => {
    if (!item) return '-';
    if (typeof item === 'object') return item[nameField] || item.username || item.license_plate || '-';
    const found = list.find(x => String(x.id) === String(item));
    return found ? (found[nameField] || found.username || found.license_plate) : item; 
  };

  const worksColumns = [
    {
      title: 'Робота',
      dataIndex: 'work',
      key: 'work',
      render: (val, record) => getName(val, worksList) || record.description || 'Без назви',
    },
    {
      title: 'Виконавець',
      dataIndex: 'employee',
      key: 'employee',
      render: (val) => getName(val, employeesList),
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
          const partObj = typeof val === 'object' ? val : partsList.find(p => String(p.id) === String(val));
          if (!partObj) return typeof val === 'object' ? (val.name || '-') : val;
          return (
            <div>
                <div>{partObj.name}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{partObj.sku_code}</div>
            </div>
          );
      },
    },
    { title: 'Кількість', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Ціна', dataIndex: 'price', key: 'price', render: (val) => formatMoney(val) },
    { title: 'Сума', key: 'total', render: (_, record) => formatMoney((record.price || 0) * (record.quantity || 1)) }
  ];

  if (loading) return <LoadingSpinner />;
  if (!order) return null;

  const orderParts = order.parts || order.used_parts || [];

  const tabItems = [
    {
      key: 'works',
      label: `Виконані роботи (${order.works?.length || 0})`,
      children: (
        <div>
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => setIsWorkModalOpen(true)} style={{ marginBottom: 16, width: '100%' }}>
                Додати роботу
            </Button>
            <Table columns={worksColumns} dataSource={order.works || []} rowKey={(r) => r.id || Math.random()} pagination={false} size="small" bordered />
        </div>
      ),
    },
    {
      key: 'parts',
      label: `Використані запчастини (${orderParts.length})`,
      children: (
        <div>
             <Button type="dashed" icon={<ToolOutlined />} onClick={() => setIsPartModalOpen(true)} style={{ marginBottom: 16, width: '100%' }}>
                Списати запчастину
            </Button>
            <Table columns={partsColumns} dataSource={orderParts} rowKey={(r) => r.id || Math.random()} pagination={false} size="small" bordered />
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
            <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/orders/${id}/edit`)}>Редагувати</Button>
          </Space>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered size="small">
          <Descriptions.Item label="Номер"><strong>{order.order_number || `#${order.id}`}</strong></Descriptions.Item>
          <Descriptions.Item label="Статус"><StatusTag status={order.status} type="order" /></Descriptions.Item>
          <Descriptions.Item label="Сума"><strong style={{ color: '#52c41a' }}>{formatMoney(order.total_cost)}</strong></Descriptions.Item>
          
          <Descriptions.Item label="Клієнт">
            {order.client ? (
              <Link to={`/clients/${order.client.id || order.client}`}>
                {getName(order.client, [], 'name')}
              </Link>
            ) : '-'}
          </Descriptions.Item>
          
          <Descriptions.Item label="Вантажівка">
             {order.truck ? (
                <Link to={`/trucks/${(order.truck.id || order.truck)}`}>
                  {getName(order.truck, [], 'license_plate')}
                </Link>
             ) : '-'}
          </Descriptions.Item>
          
          <Descriptions.Item label="VIN">
             {order.truck?.last_seven_vin || (order.truck && order.truck.full_vin ? `...${order.truck.full_vin.slice(-7)}` : '-')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      {/* Модалки */}
      <Modal title="Додати роботу" open={isWorkModalOpen} onCancel={() => setIsWorkModalOpen(false)} footer={null} destroyOnClose>
        <Form form={formWork} layout="vertical" onFinish={handleAddWork}>
            <Form.Item name="work" label="Послуга" rules={[{ required: true }]}>
                 <Select 
                    showSearch placeholder="Оберіть послугу" optionFilterProp="label" 
                    options={worksList.map(w => ({ value: w.id, label: w.name }))} 
                 />
            </Form.Item>
            <Form.Item name="employee" label="Механік">
                 <Select showSearch placeholder="Оберіть механіка" optionFilterProp="label" options={employeesList.map(e => ({ value: e.id, label: e.name || e.username }))} />
            </Form.Item>
            <Form.Item name="hours" label="Годин" initialValue={1}><InputNumber min={0.1} step={0.1} style={{ width: '100%' }} /></Form.Item>
            <Button type="primary" htmlType="submit" loading={modalLoading} block>Зберегти</Button>
        </Form>
      </Modal>

      <Modal title="Списати запчастину" open={isPartModalOpen} onCancel={() => setIsPartModalOpen(false)} footer={null} destroyOnClose>
        <Form form={formPart} layout="vertical" onFinish={handleAddPart}>
            <Form.Item name="part" label="Запчастина" rules={[{ required: true }]}>
                <Select showSearch placeholder="Пошук..." optionFilterProp="label" onChange={onPartSelect}
                    options={partsList.map(p => ({ value: p.id, label: `${p.sku_code} - ${p.name}` }))}
                />
            </Form.Item>
            <Space>
                <Form.Item name="quantity" label="К-сть" initialValue={1}><InputNumber min={1} /></Form.Item>
                <Form.Item name="price" label="Ціна"><InputNumber min={0} /></Form.Item>
            </Space>
            <Button type="primary" htmlType="submit" loading={modalLoading} block>Списати</Button>
        </Form>
      </Modal>
    </div>
  );
}

export default OrderDetailPage;
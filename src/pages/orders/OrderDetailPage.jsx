import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Table, Tag, message, Tabs, Space, Modal, Form, Select, InputNumber, Input } from 'antd';
import { EditOutlined, PrinterOutlined, PlusOutlined, DeleteOutlined, ToolOutlined, ClearOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ordersAPI, worksAPI, employeesAPI, inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatDate, formatDateTime, formatMoney } from '../../utils/formatters';

function OrderDetailPage() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Стани для модальних вікон
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Дані для випадаючих списків
  const [worksList, setWorksList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [partsList, setPartsList] = useState([]);

  const [formWork] = Form.useForm();
  const [formPart] = Form.useForm();
  
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const data = await ordersAPI.getById(id);
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      message.error('Не вдалося завантажити дані замовлення');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  // --- ЗАВАНТАЖЕННЯ ДОВІДНИКІВ (при відкритті модалок) ---
  const fetchDirectories = async () => {
    try {
      // Завантажуємо паралельно, якщо списки ще порожні
      if (worksList.length === 0 || employeesList.length === 0 || partsList.length === 0) {
        const [worksRes, employeesRes, partsRes] = await Promise.all([
            worksAPI.getAll().catch(() => []),
            employeesAPI.getAll().catch(() => []),
            inventoryAPI.getAll({ page_size: 1000 }).catch(() => []) // Беремо побільше запчастин
        ]);
        
        setWorksList(worksRes.results || worksRes || []);
        setEmployeesList(employeesRes.results || employeesRes || []);
        setPartsList(partsRes.results || partsRes || []);
      }
    } catch (error) {
      console.error("Error loading directories", error);
    }
  };

  const openWorkModal = () => {
    fetchDirectories();
    setIsWorkModalOpen(true);
  };

  const openPartModal = () => {
    fetchDirectories();
    setIsPartModalOpen(true);
  };

  // --- ОБРОБНИКИ ФОРМ ---

  const handleAddWork = async (values) => {
    setModalLoading(true);
    try {
      await ordersAPI.addWork(id, values);
      message.success('Роботу додано');
      setIsWorkModalOpen(false);
      formWork.resetFields();
      fetchOrder(); // Оновлюємо замовлення, щоб побачити зміни
    } catch (error) {
      message.error('Помилка при додаванні роботи');
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
      fetchOrder();
    } catch (error) {
      // Часто бекенд повертає помилку, якщо на складі недостатньо товару
      if (error.response?.data?.error) {
          message.error(error.response.data.error);
      } else {
          message.error('Помилка при додаванні запчастини');
      }
    } finally {
      setModalLoading(false);
    }
  };

  // При виборі запчастини підставляємо ціну продажу
  const onPartSelect = (partId) => {
    const part = partsList.find(p => p.id === partId);
    if (part) {
        formPart.setFieldsValue({ price: part.selling_price });
    }
  };

  // --- КОЛОНКИ ТАБЛИЦЬ ---

  const worksColumns = [
    {
      title: 'Робота',
      dataIndex: ['work', 'name'],
      key: 'work',
      render: (_, record) => record.work?.name || record.description || '-',
    },
    {
      title: 'Виконавець',
      dataIndex: ['employee', 'name'], // Або username, залежно від бекенду
      key: 'employee',
      render: (_, record) => record.employee?.name || record.employee?.username || '-',
    },
    {
      title: 'Годин',
      dataIndex: 'hours', // Перевір, як бекенд віддає це поле (hours або standard_hours)
      key: 'hours',
      render: (val) => val || '-',
    },
    {
        title: 'Вартість',
        dataIndex: 'amount', // або total_cost
        key: 'amount',
        render: (val) => formatMoney(val),
    },
  ];

  const partsColumns = [
    {
      title: 'Запчастина',
      dataIndex: ['part', 'name'],
      key: 'part',
      render: (_, record) => (
        <div>
            <div>{record.part?.name || '-'}</div>
            <div style={{ fontSize: '11px', color: '#888' }}>{record.part?.sku_code}</div>
        </div>
      ),
    },
    {
      title: 'Кількість',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Ціна',
      dataIndex: 'price', // Ціна продажу в момент додавання
      key: 'price',
      render: (val) => formatMoney(val),
    },
    {
        title: 'Сума',
        key: 'total',
        render: (_, record) => formatMoney((record.price || 0) * (record.quantity || 1)),
    }
  ];

  // --- РЕНДЕРИНГ ---

  if (loading) return <LoadingSpinner />;
  if (!order) return null;

  // Об'єднуємо запчастини з усіх робіт (якщо структура складна) або беремо з кореня
  // Припустимо, що бекенд віддає списки works і parts прямо в об'єкті order
  const orderParts = order.parts || []; 
  // Якщо запчастини вкладені в роботи, розкоментуй це:
  // const orderParts = order.works?.flatMap(w => w.used_parts) || [];

  const tabItems = [
    {
      key: 'works',
      label: `Виконані роботи (${order.works?.length || 0})`,
      children: (
        <div>
            <Button type="dashed" icon={<PlusOutlined />} onClick={openWorkModal} style={{ marginBottom: 16 }} block>
                Додати роботу
            </Button>
            <Table
            columns={worksColumns}
            dataSource={order.works || []}
            rowKey="id"
            pagination={false}
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
             <Button type="dashed" icon={<ToolOutlined />} onClick={openPartModal} style={{ marginBottom: 16 }} block>
                Списати запчастину зі складу
            </Button>
            <Table
            columns={partsColumns}
            dataSource={orderParts}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: 'Запчастини не використано' }}
            />
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
            >
              Редагувати шапку
            </Button>
          </Space>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="Номер">
            <strong>{order.order_number || `#${order.id}`}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Статус">
            <StatusTag status={order.status} type="order" />
          </Descriptions.Item>
          <Descriptions.Item label="Загальна сума">
            <strong style={{ color: '#52c41a', fontSize: '16px' }}>
              {formatMoney(order.total_cost)}
            </strong>
          </Descriptions.Item>
          <Descriptions.Item label="Клієнт">
            {order.client ? (
              <Link to={`/clients/${order.client.id}`}>
                {order.client.name}
              </Link>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Вантажівка">
            {order.truck ? (
              <Link to={`/trucks/${order.truck.id}`}>
                {order.truck.license_plate}
              </Link>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="VIN">
            {order.truck?.last_seven_vin ? `...${order.truck.last_seven_vin}` : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      {/* --- МОДАЛКА: ДОДАТИ РОБОТУ --- */}
      <Modal
        title="Додати роботу"
        open={isWorkModalOpen}
        onCancel={() => setIsWorkModalOpen(false)}
        footer={null}
      >
        <Form form={formWork} layout="vertical" onFinish={handleAddWork}>
            <Form.Item name="work" label="Послуга" rules={[{ required: true, message: 'Оберіть послугу' }]}>
                <Select 
                    showSearch 
                    placeholder="Пошук послуги..."
                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    options={worksList.map(w => ({ value: w.id, label: w.name }))}
                />
            </Form.Item>
            <Form.Item name="employee" label="Виконавець (Механік)">
                <Select 
                    placeholder="Оберіть механіка"
                    options={employeesList.map(e => ({ value: e.id, label: e.name || e.username }))}
                />
            </Form.Item>
            <Form.Item name="hours" label="Витрачено годин" initialValue={1}>
                <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={modalLoading} block>
                Додати в наряд
            </Button>
        </Form>
      </Modal>

      {/* --- МОДАЛКА: ДОДАТИ ЗАПЧАСТИНУ --- */}
      <Modal
        title="Списати запчастину"
        open={isPartModalOpen}
        onCancel={() => setIsPartModalOpen(false)}
        footer={null}
      >
        <Form form={formPart} layout="vertical" onFinish={handleAddPart}>
            <Form.Item name="part" label="Запчастина" rules={[{ required: true, message: 'Оберіть запчастину' }]}>
                <Select 
                    showSearch 
                    placeholder="Введіть назву або артикул..."
                    optionFilterProp="label"
                    onChange={onPartSelect}
                    options={partsList.map(p => ({ 
                        value: p.id, 
                        label: `${p.sku_code} - ${p.name} (Зал: ${p.quantity})` 
                    }))}
                />
            </Form.Item>
            <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item name="quantity" label="Кількість" initialValue={1} style={{ flex: 1 }}>
                    <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="price" label="Ціна (за од.)" style={{ flex: 1 }} rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </div>
            <Button type="primary" htmlType="submit" loading={modalLoading} block>
                Додати та списати
            </Button>
        </Form>
      </Modal>

    </div>
  );
}

export default OrderDetailPage;
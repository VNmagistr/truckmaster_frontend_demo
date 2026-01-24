import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Table, Tag, message, Tabs, Space, Modal, Form, Select, InputNumber } from 'antd';
import { EditOutlined, PrinterOutlined, PlusOutlined, DeleteOutlined, ToolOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ordersAPI, worksAPI, employeesAPI, inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatMoney } from '../../utils/formatters';

function OrderDetailPage() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Стани модалок
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Довідники
  const [worksList, setWorksList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [partsList, setPartsList] = useState([]);

  const [formWork] = Form.useForm();
  const [formPart] = Form.useForm();
  
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const initPage = async () => {
      setLoading(true);
      try {
        // 1. СПОЧАТКУ ВАНТАЖИМО ЗАМОВЛЕННЯ (Це критично)
        console.log("Fetching order...");
        const orderData = await ordersAPI.getById(id);
        setOrder(orderData);
        console.log("Order loaded:", orderData);

        // 2. ПОТІМ ПРОБУЄМО ЗАВАНТАЖИТИ ДОВІДНИКИ (Це не критично)
        // Використовуємо .catch() для кожного окремо, щоб помилка одного не ламала все
        try {
            const worksRes = await worksAPI.getAll().catch(err => {
                console.warn("Failed to load WORKS (API /works/ likely missing):", err);
                return [];
            });
            setWorksList(worksRes.results || worksRes || []);
            
            const employeesRes = await employeesAPI.getAll().catch(err => {
                console.warn("Failed to load EMPLOYEES (API /users/ likely missing):", err);
                return [];
            });
            setEmployeesList(employeesRes.results || employeesRes || []);

            const partsRes = await inventoryAPI.getAll({ page_size: 1000 }).catch(err => {
                console.warn("Failed to load INVENTORY:", err);
                return [];
            });
            setPartsList(partsRes.results || partsRes || []);
            
        } catch (secondaryError) {
            console.warn("Error loading secondary data:", secondaryError);
        }

      } catch (error) {
        console.error('CRITICAL Error loading order:', error);
        message.error('Не вдалося завантажити дані замовлення');
        // Не перенаправляємо одразу, щоб можна було побачити помилку в консолі
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [id]);

  // --- ЛОГІКА ДОДАВАННЯ ---

  const handleAddWork = async (values) => {
    setModalLoading(true);
    try {
      await ordersAPI.addWork(id, values);
      message.success('Роботу додано');
      setIsWorkModalOpen(false);
      formWork.resetFields();
      const updatedOrder = await ordersAPI.getById(id);
      setOrder(updatedOrder);
    } catch (error) {
      console.error(error);
      message.error('Помилка при додаванні роботи (перевірте консоль)');
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
      const updatedOrder = await ordersAPI.getById(id);
      setOrder(updatedOrder);
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

  // --- ФУНКЦІЇ ВІДОБРАЖЕННЯ (безпечні) ---

  const getName = (item, list, nameField = 'name') => {
    if (!item) return '-';
    if (typeof item === 'object') return item[nameField] || item.username || '-';
    // Шукаємо в завантаженому списку
    const found = list.find(x => String(x.id) === String(item));
    return found ? (found[nameField] || found.username) : '-'; // Якщо список пустий, поверне '-'
  };

  const worksColumns = [
    {
      title: 'Робота',
      dataIndex: 'work',
      key: 'work',
      render: (val, record) => {
          // Пробуємо дістати назву з об'єкта work, або зі списку, або з опису
          const nameFromObj = typeof val === 'object' ? val.name : null;
          const nameFromList = getName(val, worksList);
          const description = record.description;
          
          if (nameFromObj && nameFromObj !== '-') return nameFromObj;
          if (nameFromList && nameFromList !== '-') return nameFromList;
          return description || 'Без назви';
      },
    },
    {
      title: 'Виконавець',
      dataIndex: 'employee',
      key: 'employee',
      render: (val) => getName(val, employeesList),
    },
    {
      title: 'Годин',
      dataIndex: 'hours', 
      key: 'hours',
      render: (val) => val || '-',
    },
    {
        title: 'Вартість',
        dataIndex: 'amount', // або total_cost, залежить від бекенду
        key: 'amount',
        render: (val) => formatMoney(val),
    },
  ];

  const partsColumns = [
    {
      title: 'Запчастина',
      dataIndex: 'part',
      key: 'part',
      render: (val) => {
          const partObj = typeof val === 'object' ? val : partsList.find(p => String(p.id) === String(val));
          if (!partObj) return '-';
          return (
            <div>
                <div>{partObj.name}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{partObj.sku_code}</div>
            </div>
          );
      },
    },
    {
      title: 'Кількість',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Ціна',
      dataIndex: 'price',
      key: 'price',
      render: (val) => formatMoney(val),
    },
    {
        title: 'Сума',
        key: 'total',
        render: (_, record) => formatMoney((record.price || 0) * (record.quantity || 1)),
    }
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
            <Button 
                type="dashed" 
                icon={<PlusOutlined />} 
                onClick={() => setIsWorkModalOpen(true)} 
                style={{ marginBottom: 16, width: '100%' }}
            >
                Додати роботу
            </Button>
            
            <Table
                columns={worksColumns}
                dataSource={order.works || []}
                rowKey={(r) => r.id || Math.random()}
                pagination={false}
                locale={{ emptyText: 'Роботи ще не додано' }}
                size="small"
                bordered
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
                style={{ marginBottom: 16, width: '100%' }}
            >
                Списати запчастину зі складу
            </Button>
            <Table
                columns={partsColumns}
                dataSource={orderParts}
                rowKey={(r) => r.id || Math.random()}
                pagination={false}
                locale={{ emptyText: 'Запчастини не використано' }}
                size="small"
                bordered
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
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered size="small">
          <Descriptions.Item label="Номер">
            <strong>{order.order_number || `#${order.id}`}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Статус">
            <StatusTag status={order.status} type="order" />
          </Descriptions.Item>
          <Descriptions.Item label="Сума до сплати">
            <strong style={{ color: '#52c41a', fontSize: '15px' }}>
              {formatMoney(order.total_cost)}
            </strong>
          </Descriptions.Item>
          <Descriptions.Item label="Клієнт">
            {order.client ? (
              <Link to={`/clients/${order.client.id || order.client}`}>
                {getName(order.client, [], 'name')}
              </Link>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Вантажівка">
            {order.truck ? (
              <Link to={`/trucks/${order.truck.id || order.truck}`}>
                 {typeof order.truck === 'object' ? order.truck.license_plate : 'Авто #' + order.truck}
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

      {/* --- МОДАЛКИ --- */}
      
      <Modal
        title="Додати роботу"
        open={isWorkModalOpen}
        onCancel={() => setIsWorkModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={formWork} layout="vertical" onFinish={handleAddWork}>
            <Form.Item name="work" label="Послуга" rules={[{ required: true }]}>
                {worksList.length > 0 ? (
                    <Select 
                        showSearch 
                        placeholder="Оберіть послугу"
                        filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                        options={worksList.map(w => ({ value: w.id, label: w.name }))}
                    />
                ) : (
                    // Якщо список послуг не завантажився, даємо ввести текст (ID) вручну або пишемо помилку
                    <Select placeholder="Список послуг пустий (Помилка API)" disabled />
                )}
            </Form.Item>
            <Form.Item name="employee" label="Механік">
                 {employeesList.length > 0 ? (
                    <Select 
                        showSearch
                        placeholder="Оберіть виконавця"
                        filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                        options={employeesList.map(e => ({ value: e.id, label: e.name || e.username }))}
                    />
                 ) : (
                    <Select placeholder="Список працівників пустий" disabled />
                 )}
            </Form.Item>
            <Form.Item name="hours" label="Годин" initialValue={1}>
                <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={modalLoading} block>
                Зберегти
            </Button>
        </Form>
      </Modal>

      <Modal
        title="Списати запчастину"
        open={isPartModalOpen}
        onCancel={() => setIsPartModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={formPart} layout="vertical" onFinish={handleAddPart}>
            <Form.Item name="part" label="Запчастина" rules={[{ required: true }]}>
                <Select 
                    showSearch 
                    placeholder="Пошук (Назва або Артикул)"
                    optionFilterProp="label"
                    onChange={onPartSelect}
                    options={partsList.map(p => ({ 
                        value: p.id, 
                        label: `${p.sku_code} - ${p.name} (На складі: ${p.quantity})` 
                    }))}
                />
            </Form.Item>
            <Space style={{ display: 'flex' }} align="start">
                <Form.Item name="quantity" label="К-сть" initialValue={1} rules={[{ required: true }]}>
                    <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="price" label="Ціна" rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Space>
            <Button type="primary" htmlType="submit" loading={modalLoading} block>
                Списати
            </Button>
        </Form>
      </Modal>
    </div>
  );
}

export default OrderDetailPage;
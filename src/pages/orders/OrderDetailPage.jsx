import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Table, Tag, message, Tabs, Space, Modal, Form, Select, InputNumber, Divider } from 'antd';
import { EditOutlined, PrinterOutlined, PlusOutlined, DeleteOutlined, ToolOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ordersAPI, worksAPI, employeesAPI, inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatDate, formatDateTime, formatMoney } from '../../utils/formatters';

function OrderDetailPage() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Стани модалок
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Довідники для розшифровки ID в таблицях
  const [worksList, setWorksList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [partsList, setPartsList] = useState([]);

  const [formWork] = Form.useForm();
  const [formPart] = Form.useForm();
  
  const { id } = useParams();
  const navigate = useNavigate();

  // Завантажуємо замовлення + всі довідники одразу
  useEffect(() => {
    const initPage = async () => {
      setLoading(true);
      try {
        const [orderData, worksRes, employeesRes, partsRes] = await Promise.all([
          ordersAPI.getById(id),
          worksAPI.getAll().catch(() => []),
          employeesAPI.getAll().catch(() => []),
          inventoryAPI.getAll({ page_size: 1000 }).catch(() => [])
        ]);

        setOrder(orderData);
        setWorksList(worksRes.results || worksRes || []);
        setEmployeesList(employeesRes.results || employeesRes || []);
        setPartsList(partsRes.results || partsRes || []);

      } catch (error) {
        console.error('Error loading page data:', error);
        message.error('Не вдалося завантажити дані');
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
      // Оновлюємо тільки замовлення, довідники вже є
      const updatedOrder = await ordersAPI.getById(id);
      setOrder(updatedOrder);
    } catch (error) {
      console.error(error);
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

  // --- РОЗУМНІ КОЛОНКИ (Fix для пустих полів) ---

  // Функція-хелпер для отримання імені по ID
  const getName = (item, list, nameField = 'name') => {
    if (!item) return '-';
    // Якщо це об'єкт і має ім'я - повертаємо його
    if (typeof item === 'object') return item[nameField] || item.username || '-';
    // Якщо це ID (число/рядок) - шукаємо в списку
    const found = list.find(x => String(x.id) === String(item));
    return found ? (found[nameField] || found.username) : '-';
  };

  const worksColumns = [
    {
      title: 'Робота',
      dataIndex: 'work',
      key: 'work',
      render: (val, record) => {
          // Для роботи поле може бути в record.work або record.description
          const name = getName(val, worksList);
          return name !== '-' ? name : record.description || '-';
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
        dataIndex: 'amount',
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

  // Отримуємо запчастини (залежно від структури бекенду)
  const orderParts = order.parts || order.used_parts || [];

  const tabItems = [
    {
      key: 'works',
      label: `Виконані роботи (${order.works?.length || 0})`,
      children: (
        <div>
            {/* Кнопка завжди тут */}
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
                rowKey={(r) => r.id || Math.random()} // Фолбек для ключа
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
                {getName(order.client, [], 'name')} {/* Тут ім'я має бути в об'єкті */}
              </Link>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Вантажівка">
            {order.truck ? (
              <Link to={`/trucks/${order.truck.id || order.truck}`}>
                {/* Спробуємо дістати номер, навіть якщо це ID, але краще об'єкт */}
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
                <Select 
                    showSearch 
                    placeholder="Оберіть послугу"
                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    options={worksList.map(w => ({ value: w.id, label: w.name }))}
                />
            </Form.Item>
            <Form.Item name="employee" label="Механік">
                <Select 
                    showSearch
                    placeholder="Оберіть виконавця"
                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    options={employeesList.map(e => ({ value: e.id, label: e.name || e.username }))}
                />
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
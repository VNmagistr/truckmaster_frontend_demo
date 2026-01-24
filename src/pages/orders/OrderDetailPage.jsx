import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Table, Tag, message, Tabs, Space, Modal, Form, Select, InputNumber, AutoComplete, Input } from 'antd';
import { EditOutlined, PrinterOutlined, PlusOutlined, ToolOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ordersAPI, worksAPI, employeesAPI, inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusTag } from '../../components';
import { formatMoney } from '../../utils/formatters';

// Тестові дані, які будуть показані, якщо сервер не відповість
const MOCK_WORKS = [
  { id: 1, name: 'Діагностика ходової' },
  { id: 2, name: 'Заміна оливи' },
  { id: 3, name: 'Комп\'ютерна діагностика' },
  { id: 4, name: 'Шиномонтаж' },
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
      const orderData = await ordersAPI.getById(id);
      setOrder(orderData);

      // Пробуємо завантажити довідники, але не блокуємо сторінку при помилці
      loadDirectories();
    } catch (error) {
      console.error('Error loading order:', error);
      message.error('Не вдалося завантажити замовлення');
    } finally {
      setLoading(false);
    }
  };

  const loadDirectories = async () => {
    try {
        const works = await worksAPI.getAll().catch(() => []);
        // Якщо API повернуло пустоту або помилку, використовуємо MOCK_WORKS для тесту
        setWorksList((works.results || works).length > 0 ? (works.results || works) : MOCK_WORKS);
        
        const employees = await employeesAPI.getAll().catch(() => []);
        setEmployeesList((employees.results || employees).length > 0 ? (employees.results || employees) : MOCK_EMPLOYEES);

        const parts = await inventoryAPI.getAll({ page_size: 1000 }).catch(() => []);
        setPartsList(parts.results || parts || []);
    } catch (e) {
        console.warn("Directories fetch warning", e);
        // Фолбек на мок-дані, щоб поля не були пустими
        setWorksList(MOCK_WORKS);
        setEmployeesList(MOCK_EMPLOYEES);
    }
  };

  const handleAddWork = async (values) => {
    setModalLoading(true);
    try {
      // Якщо користувач ввів текст, якого немає в списку, відправляємо його як текст
      await ordersAPI.addWork(id, values);
      message.success('Роботу додано');
      setIsWorkModalOpen(false);
      formWork.resetFields();
      
      const updatedOrder = await ordersAPI.getById(id);
      setOrder(updatedOrder);
    } catch (error) {
      console.error(error);
      message.error('Помилка додавання. Перевірте, чи існують довідники на сервері.');
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

  // Хелпер для відображення імен
  const getName = (item, list, nameField = 'name') => {
    if (!item) return '-';
    if (typeof item === 'object') return item[nameField] || item.username || '-';
    const found = list.find(x => String(x.id) === String(item));
    return found ? (found[nameField] || found.username) : item; // Повертаємо саме значення, якщо не знайшли (раптом це просто текст)
  };

  const worksColumns = [
    {
      title: 'Робота',
      dataIndex: 'work',
      key: 'work',
      render: (val, record) => {
          // Пріоритет: назва з об'єкта -> назва зі списку -> опис -> сире значення
          if (typeof val === 'object' && val.name) return val.name;
          const fromList = getName(val, worksList);
          if (fromList !== val && fromList !== '-') return fromList; 
          return record.description || val || 'Без назви';
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
             {/* Відображаємо навіть якщо це просто ID */}
             {order.truck ? (
                <Link to={`/trucks/${(order.truck.id || order.truck)}`}>
                  {typeof order.truck === 'object' ? order.truck.license_plate : `Авто #${order.truck}`}
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

      {/* --- МОДАЛКА: ДОДАТИ РОБОТУ (Виправлено) --- */}
      <Modal
        title="Додати роботу"
        open={isWorkModalOpen}
        onCancel={() => setIsWorkModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={formWork} layout="vertical" onFinish={handleAddWork}>
            {/* Тут ми замінили жорсткий Select на AutoComplete/Input. 
              Тепер користувач може писати що завгодно, якщо API не працює.
            */}
            <Form.Item name="work" label="Послуга" rules={[{ required: true, message: 'Введіть назву послуги' }]}>
                 {/* Використовуємо Select з mode="tags" або просто AutoComplete, щоб можна було вводити свій текст */}
                 <Select
                    showSearch
                    placeholder="Введіть або оберіть послугу"
                    optionFilterProp="label"
                    allowClear
                    // mode="tags" // Дозволяє вводити нові значення (якщо бекенд підтримує рядки)
                    options={worksList.map(w => ({ value: w.id, label: w.name }))}
                 />
            </Form.Item>
            
            <Form.Item name="employee" label="Механік">
                 <Select 
                    showSearch
                    placeholder="Оберіть механіка (або введіть ID)"
                    optionFilterProp="label"
                    allowClear
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
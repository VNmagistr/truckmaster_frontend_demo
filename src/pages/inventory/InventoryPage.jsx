import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Card, Tag, Tabs, Select, Popconfirm } from 'antd';
import { SearchOutlined, PlusOutlined, WarningOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components';
import { formatMoney } from '../../utils/formatters';

function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Пагінація та Пошук
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [searchText, setSearchText] = useState('');
  
  const [activeTab, setActiveTab] = useState('all');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  // Перезавантажуємо при зміні фільтрів або сторінки
  useEffect(() => {
    fetchProducts(pagination.current, searchText);
  }, [pagination.current, activeTab, selectedCategory]);

  // Debounce для пошуку
  useEffect(() => {
    const timer = setTimeout(() => {
        setPagination(prev => ({ ...prev, current: 1 })); // Скидаємо на 1 сторінку
        fetchProducts(1, searchText);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchText]);

  const fetchCategories = async () => {
    try {
      const response = await inventoryAPI.getCategories();
      // Безпечна розпаковка
      const data = response.data || response;
      setCategories(data.results || data || []);
    } catch (error) {
      // Не показуємо помилку користувачу, бо це не критично
    }
  };

  const fetchProducts = async (page, search) => {
    setLoading(true);
    try {
      const params = {
        page: page,
        page_size: 20,
        search: search, // Серверний пошук
        ordering: 'name',
      };
      
      if (activeTab === 'low_stock') {
        params.low_stock = true;
      }
      
      if (selectedCategory) {
        params.category = selectedCategory;
      }

      const response = await inventoryAPI.getAll(params);
      
      // 🔥 ВИПРАВЛЕННЯ: Правильна розпаковка даних
      const data = response.data || response;
      
      setProducts(data.results || data || []);
      setPagination(prev => ({
        ...prev,
        current: page,
        total: data.count || 0,
      }));

    } catch (error) {
      message.error('Не вдалося завантажити склад');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await inventoryAPI.delete(id);
      message.success('Товар видалено');
      fetchProducts(pagination.current, searchText);
    } catch (error) {
      message.error('Не вдалося видалити товар');
    }
  };

  const columns = [
    {
      title: 'Артикул',
      dataIndex: 'article_number', // Якщо на бекенді sku_code, поміняй на 'sku_code'
      key: 'article_number',
      render: (text, record) => record.sku_code || text || '-', // Фолбек
    },
    {
      title: 'Назва',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: 'Бренд',
      dataIndex: 'brand',
      key: 'brand',
    },
    {
      title: 'Категорія',
      dataIndex: ['category', 'name'],
      key: 'category',
      render: (text, record) => {
         // Обробка вкладеного об'єкта або ID
         const catName = record.category?.name || record.subcategory?.name || '-';
         return <Tag>{catName}</Tag>;
      },
    },
    {
      title: 'Кількість',
      dataIndex: 'current_stock', // На бекенді часто current_stock або quantity
      key: 'quantity',
      render: (qty, record) => {
        // Підтримка обох назв полів
        const quantity = qty !== undefined ? qty : record.quantity;
        return (
            <Tag color={(quantity || 0) <= (record.min_stock_level || 0) ? 'red' : 'green'}>
            {quantity > 0 ? `${quantity} шт.` : 'Немає'}
            </Tag>
        );
      },
    },
    {
      title: 'Ціна закуп.',
      dataIndex: 'selling_price', // або cost_price
      key: 'price',
      render: (price) => formatMoney(price),
    },
    {
      title: 'Дії',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EyeOutlined />} onClick={() => navigate(`/inventory/${record.id}`)} />
          <Button icon={<EditOutlined />} onClick={() => navigate(`/inventory/${record.id}/edit`)} />
          <Popconfirm title="Видалити товар?" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    { key: 'all', label: 'Всі товари' },
    { 
      key: 'low_stock', 
      label: (
        <span>
          <WarningOutlined /> Закінчуються
        </span>
      )
    },
  ];

  if (loading && products.length === 0) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Склад запчастин"
        extra={
          <Space>
            <Input
              placeholder="Пошук (Назва, Артикул)..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
            
            <Select
              placeholder="Категорія"
              allowClear
              style={{ width: 150 }}
              value={selectedCategory}
              onChange={setSelectedCategory}
            >
              {categories.map(cat => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/inventory/new')}
            >
              Додати товар
            </Button>
          </Space>
        }
      />

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ marginBottom: 16 }}
        />

        {products.length > 0 ? (
          <Table
            columns={columns}
            dataSource={products}
            rowKey="id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: false,
              showTotal: (total, range) => `${range[0]}-${range[1]} з ${total}`
            }}
            onChange={(newPag) => setPagination(prev => ({ ...prev, current: newPag.current }))}
            size="middle"
          />
        ) : (
          <EmptyState
            description={activeTab === 'low_stock' ? 'Товарів з низьким залишком немає' : 'Товарів поки немає'}
            buttonText={activeTab !== 'low_stock' ? 'Додати товар' : null}
            onButtonClick={activeTab !== 'low_stock' ? () => navigate('/inventory/new') : undefined}
          />
        )}
      </Card>
    </div>
  );
}

export default InventoryPage;
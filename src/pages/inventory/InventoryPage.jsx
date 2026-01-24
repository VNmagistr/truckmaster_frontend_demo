import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Card, Tag, Tabs, Select, Popconfirm } from 'antd';
import { SearchOutlined, PlusOutlined, WarningOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components';
import { formatCurrency } from '../../utils/formatters';

function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState(''); // Пошук
  const [activeTab, setActiveTab] = useState('all');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [activeTab, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const categoriesRes = await inventoryAPI.getCategories().catch(() => []);
      setCategories(categoriesRes.results || categoriesRes || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {}; // Завантажуємо все без серверної пагінації
      
      if (activeTab === 'low_stock') {
        params.low_stock = true;
      }
      
      if (selectedCategory) {
        params.category = selectedCategory;
      }

      const response = await inventoryAPI.getAll(params);
      setProducts(response.results || response || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      message.error('Не вдалося завантажити склад');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await inventoryAPI.delete(id);
      message.success('Товар видалено');
      fetchProducts();
    } catch (error) {
      message.error('Не вдалося видалити товар');
    }
  };

  // --- ЛОГІКА ПОШУКУ ---
  const filteredProducts = products.filter(product => {
    const value = searchText.toLowerCase();
    return (
      product.name?.toLowerCase().includes(value) ||
      product.article_number?.toLowerCase().includes(value) ||
      product.brand?.toLowerCase().includes(value)
    );
  });

  const columns = [
    {
      title: 'Артикул',
      dataIndex: 'article_number',
      key: 'article_number',
    },
    {
      title: 'Назва',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <span style={{ fontWeight: 500 }}>{text}</span>,
      sorter: (a, b) => a.name.localeCompare(b.name),
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
      render: (text) => <Tag>{text || 'Інше'}</Tag>,
    },
    {
      title: 'Кількість',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty, record) => (
        <Tag color={qty <= (record.min_quantity || 0) ? 'red' : 'green'}>
          {qty > 0 ? `${qty} шт.` : 'Немає'}
        </Tag>
      ),
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: 'Ціна закуп.',
      dataIndex: 'price',
      key: 'price',
      render: (price) => formatCurrency(price),
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
            {/* ПОЛЕ ПОШУКУ */}
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
            dataSource={filteredProducts} // Фільтровані дані
            rowKey="id"
            pagination={{ 
              pageSize: 20, 
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} з ${total}`
            }}
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
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Card, Tag, Tabs, Select } from 'antd';
import { SearchOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components';
import { formatMoney } from '../../utils/formatters';
import { CATEGORY_TYPES } from '../../utils/constants';

function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [pagination.current, pagination.pageSize, activeTab, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const [categoriesRes, subcategoriesRes] = await Promise.all([
        inventoryAPI.getCategories().catch(() => []),
        inventoryAPI.getSubcategories().catch(() => []),
      ]);
      setCategories(categoriesRes.results || categoriesRes || []);
      setSubcategories(subcategoriesRes.results || subcategoriesRes || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
      };

      if (activeTab === 'low_stock') {
        const response = await inventoryAPI.getLowStock();
        const data = response.results || response || [];
        setProducts(Array.isArray(data) ? data : []);
        setPagination(prev => ({ ...prev, total: data.length }));
        setLoading(false);
        return;
      }

      if (selectedCategory) {
        params.subcategory__category = selectedCategory;
      }

      const response = await inventoryAPI.getProducts(params);
      const data = response.results || response;
      setProducts(Array.isArray(data) ? data : []);
      setPagination(prev => ({
        ...prev,
        total: response.count || data.length || 0,
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      message.error('Не вдалося завантажити список товарів');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (paginationConfig) => {
    setPagination({
      ...pagination,
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
    });
  };

  const getColumnSearchProps = (dataIndex, placeholder) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          placeholder={placeholder}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Пошук
          </Button>
          <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 90 }}>
            Скинути
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]?.toString().toLowerCase().includes(value.toLowerCase()),
  });

  const columns = [
    {
      title: 'Артикул',
      dataIndex: 'sku_code',
      key: 'sku_code',
      width: 120,
      ...getColumnSearchProps('sku_code', 'Пошук по артикулу'),
      render: (text) => <code>{text}</code>,
    },
    {
      title: 'Назва',
      dataIndex: 'name',
      key: 'name',
      ...getColumnSearchProps('name', 'Пошук по назві'),
      render: (text, record) => (
        <Link to={`/inventory/${record.id}`} style={{ fontWeight: 500 }}>
          {text}
          {record.viscosity && <span style={{ color: '#666' }}> {record.viscosity}</span>}
        </Link>
      ),
    },
    {
      title: 'Бренд',
      dataIndex: 'brand',
      key: 'brand',
      width: 100,
      render: (brand) => brand || '-',
    },
    {
      title: 'Категорія',
      dataIndex: 'subcategory_name',
      key: 'category',
      render: (subcat, record) => subcat || record.subcategory?.name || '-',
    },
    {
      title: 'Ціна',
      dataIndex: 'selling_price',
      key: 'price',
      width: 120,
      sorter: (a, b) => (a.selling_price || 0) - (b.selling_price || 0),
      render: (price) => formatMoney(price),
    },
    {
      title: 'Залишок',
      dataIndex: 'current_stock',
      key: 'stock',
      width: 100,
      sorter: (a, b) => (a.current_stock || 0) - (b.current_stock || 0),
      render: (stock, record) => {
        const isLow = stock <= (record.min_stock_level || 0);
        return (
          <span style={{ color: isLow ? '#ff4d4f' : undefined }}>
            {stock || 0} {record.unit === 'l' ? 'л' : 'шт'}
            {isLow && <WarningOutlined style={{ marginLeft: 4, color: '#ff4d4f' }} />}
          </span>
        );
      },
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'status',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? 'Активний' : 'Неактивний'}
        </Tag>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'all',
      label: 'Всі товари',
    },
    {
      key: 'low_stock',
      label: (
        <span>
          <WarningOutlined style={{ color: '#ff4d4f' }} />
          Низький залишок
        </span>
      ),
    },
  ];

  if (loading && products.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <PageHeader
        title="Склад"
        subtitle={`Всього товарів: ${pagination.total}`}
        extra={
          <Space>
            <Select
              placeholder="Фільтр по категорії"
              allowClear
              style={{ width: 200 }}
              value={selectedCategory}
              onChange={(value) => {
                setSelectedCategory(value);
                setPagination(prev => ({ ...prev, current: 1 }));
              }}
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
          onChange={(key) => {
            setActiveTab(key);
            setPagination(prev => ({ ...prev, current: 1 }));
          }}
          items={tabItems}
          style={{ marginBottom: 16 }}
        />

        {products.length > 0 ? (
          <Table
            columns={columns}
            dataSource={products}
            rowKey="id"
            loading={loading}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} з ${total}`,
            }}
            onChange={handleTableChange}
            size="middle"
          />
        ) : (
          <EmptyState
            description={activeTab === 'low_stock' ? 'Товарів з низьким залишком немає' : 'Товарів поки немає'}
            buttonText={activeTab !== 'low_stock' ? 'Додати товар' : null}
            onButtonClick={activeTab !== 'low_stock' ? () => navigate('/inventory/new') : null}
          />
        )}
      </Card>
    </div>
  );
}

export default InventoryPage;
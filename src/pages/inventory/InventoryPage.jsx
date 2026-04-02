import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Card, Tag, Tabs, Select, Popconfirm, Tooltip } from 'antd';
import { SearchOutlined, PlusOutlined, WarningOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UndoOutlined, ShoppingCartOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components';
import ModuleUnavailableBanner from '../../components/ModuleUnavailableBanner';
import { formatMoney } from '../../utils/formatters';
import OrderListTab from './OrderListTab';
import WholesaleTab from './WholesaleTab';

function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Пагінація та Пошук
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [searchText, setSearchText] = useState('');   // значення інпута
  const [searchQuery, setSearchQuery] = useState(''); // debounced — надсилається на сервер

  const [activeTab, setActiveTab] = useState('all');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [moduleUnavailable, setModuleUnavailable] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  // Debounce: очищення — одразу, набір тексту — 500мс затримка
  useEffect(() => {
    console.log('[SEARCH] searchText changed:', JSON.stringify(searchText));
    if (searchText === '') {
      console.log('[SEARCH] empty → reset searchQuery immediately');
      setSearchQuery('');
      setPagination(prev => ({ ...prev, current: 1 }));
      return;
    }
    const timer = setTimeout(() => {
      console.log('[SEARCH] debounce fired, setting searchQuery:', JSON.stringify(searchText));
      setSearchQuery(searchText);
      setPagination(prev => ({ ...prev, current: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Єдиний fetch-ефект — спрацьовує при зміні будь-якого фільтра або пагінації
  useEffect(() => {
    console.log('[FETCH] effect triggered, searchQuery:', JSON.stringify(searchQuery), 'page:', pagination.current);
    fetchProducts(pagination.current, searchQuery);
  }, [pagination.current, activeTab, selectedCategory, showDeleted, searchQuery]);

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
        search: search,
        ordering: 'name',
      };
      console.log('[API] GET /inventory/products/ params:', params);
      
      if (activeTab === 'low_stock') {
        params.low_stock = true;
      }
      
      if (selectedCategory) {
        params.category = selectedCategory;
      }

      if (showDeleted) params.show_deleted = true;

      const response = await inventoryAPI.getAll(params);
      const data = response.data || response;
      console.log('[API] response: count=', data.count, 'results=', (data.results || data || []).length);
      setProducts(data.results || data || []);
      setPagination(prev => ({
        ...prev,
        current: page,
        total: data.count || 0,
      }));

    } catch (error) {
      console.error('[API] error:', error?.response?.status, error?.response?.data || error?.message);
      if (error.isModuleUnavailable) { setModuleUnavailable(true); return; }
      message.error('Не вдалося завантажити склад');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await inventoryAPI.markForDeletion(id);
      message.success('Товар видалено');
      fetchProducts(pagination.current, searchQuery);
    } catch (error) {
      message.error('Не вдалося видалити товар');
    }
  };

  const handleUnmarkForDeletion = async (id) => {
    try {
      await inventoryAPI.unmarkForDeletion(id);
      message.success('Товар відновлено');
      fetchProducts(pagination.current, searchQuery);
    } catch (error) {
      message.error('Не вдалося відновити товар');
    }
  };

  const handleRowClick = (record) => {
    navigate(`/inventory/${record.id}`);
  };

  const columns = [
    {
      title: 'Артикул',
      dataIndex: 'sku_code',
      key: 'sku_code',
      render: (text) => text || '-',
    },
    {
      title: 'Назва',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <span>
          <span style={{ fontWeight: 500 }}>{text}</span>
          {record.marked_for_deletion && (
            <Tag color="error" style={{ marginLeft: 8 }}>Видалено</Tag>
          )}
        </span>
      ),
    },
    {
      title: 'Бренд',
      dataIndex: 'brand',
      key: 'brand',
    },
    {
      title: 'Категорія',
      key: 'category',
      render: (_, record) => {
        const catName = record.subcategory_name || record.category_name || record.subcategory?.name || record.category?.name || '-';
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
      title: 'Ціна продажу',
      dataIndex: 'selling_price',
      key: 'price',
      render: (price) => formatMoney(price),
    },
    {
      title: 'Дії',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle" onClick={(e) => e.stopPropagation()}>
          <Button icon={<EyeOutlined />} onClick={() => navigate(`/inventory/${record.id}`)} />
          {record.marked_for_deletion ? (
            <Tooltip title="Відновити товар">
              <Button
                icon={<UndoOutlined />}
                onClick={() => handleUnmarkForDeletion(record.id)}
                style={{ color: '#52c41a', borderColor: '#52c41a' }}
              />
            </Tooltip>
          ) : (
            <>
              <Button icon={<EditOutlined />} onClick={() => navigate(`/inventory/${record.id}/edit`)} />
              <Popconfirm title="Видалити товар?" onConfirm={() => handleDelete(record.id)}>
                <Button icon={<DeleteOutlined />} danger />
              </Popconfirm>
            </>
          )}
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
    {
      key: 'wholesale',
      label: (
        <span>
          <DatabaseOutlined /> Оптовий
        </span>
      )
    },
    {
      key: 'order_list',
      label: (
        <span>
          <ShoppingCartOutlined /> Замовити
        </span>
      )
    },
  ];

  if (moduleUnavailable) return <ModuleUnavailableBanner moduleName="Склад" />;
  if (loading && products.length === 0 && activeTab !== 'order_list' && activeTab !== 'wholesale') return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Склад запчастин"
        extra={
          activeTab !== 'order_list' && activeTab !== 'wholesale' && (
            <Space>
              <Input
                placeholder="Назва або артикул (будь-яка частина)..."
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                onChange={e => { console.log('[INPUT] onChange, value:', JSON.stringify(e.target.value)); setSearchText(e.target.value); }}
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
                type={showDeleted ? 'primary' : 'default'}
                danger={showDeleted}
                onClick={() => {
                  setShowDeleted(!showDeleted);
                  setPagination(prev => ({ ...prev, current: 1 }));
                }}
              >
                {showDeleted ? 'Приховати видалені' : 'Показати видалені'}
              </Button>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/inventory/new')}
              >
                Додати товар
              </Button>
            </Space>
          )
        }
      />

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ marginBottom: 16 }}
        />

        {activeTab === 'wholesale' ? (
          <WholesaleTab />
        ) : activeTab === 'order_list' ? (
          <OrderListTab />
        ) : products.length > 0 ? (
          <Table
            columns={columns}
            dataSource={products}
            rowKey="id"
            scroll={{ x: 'max-content' }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: false,
              showTotal: (total, range) => `${range[0]}-${range[1]} з ${total}`
            }}
            onChange={(newPag) => setPagination(prev => ({ ...prev, current: newPag.current }))}
            size="middle"
            rowClassName={(record) =>
              record.marked_for_deletion ? 'row-marked-for-deletion' : 'row-clickable'
            }
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              style: { cursor: 'pointer' },
            })}
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
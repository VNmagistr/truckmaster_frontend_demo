import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Card, Tag, Tabs, Select, Popconfirm, Tooltip } from 'antd';
import { SearchOutlined, PlusOutlined, WarningOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UndoOutlined, ShoppingCartOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components';
import ModuleUnavailableBanner from '../../components/ModuleUnavailableBanner';
import { formatMoney } from '../../utils/formatters';
import OrderListTab from './OrderListTab';
import WholesaleTab from './WholesaleTab';

function InventoryPage() {
  const { t } = useTranslation();
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
    if (searchText === '') {
      setSearchQuery('');
      setPagination(prev => ({ ...prev, current: 1 }));
      return;
    }
    const timer = setTimeout(() => {
      setSearchQuery(searchText);
      setPagination(prev => ({ ...prev, current: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Єдиний fetch-ефект — спрацьовує при зміні будь-якого фільтра або пагінації
  useEffect(() => {
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
      
      if (activeTab === 'low_stock') {
        params.low_stock = true;
      }
      
      if (selectedCategory) {
        params.category = selectedCategory;
      }

      if (showDeleted) params.show_deleted = true;

      const response = await inventoryAPI.getAll(params);
      const data = response.data || response;
      setProducts(data.results || data || []);
      setPagination(prev => ({
        ...prev,
        current: page,
        total: data.count || 0,
      }));

    } catch (error) {
      if (error.isModuleUnavailable) { setModuleUnavailable(true); return; }
      message.error(t('inventory.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await inventoryAPI.markForDeletion(id);
      message.success(t('inventory.deleteSuccess'));
      fetchProducts(pagination.current, searchQuery);
    } catch (error) {
      message.error(t('inventory.deleteError'));
    }
  };

  const handleUnmarkForDeletion = async (id) => {
    try {
      await inventoryAPI.unmarkForDeletion(id);
      message.success(t('inventory.restoreSuccess'));
      fetchProducts(pagination.current, searchQuery);
    } catch (error) {
      message.error(t('inventory.restoreError'));
    }
  };

  const handleRowClick = (record) => {
    navigate(`/inventory/${record.id}`);
  };

  const columns = [
    {
      title: t('inventory.sku'),
      dataIndex: 'sku_code',
      key: 'sku_code',
      render: (text) => text || '-',
    },
    {
      title: t('common.name'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <span>
          <span style={{ fontWeight: 500 }}>{text}</span>
          {record.marked_for_deletion && (
            <Tag color="error" style={{ marginLeft: 8 }}>{t('inventory.deleted')}</Tag>
          )}
        </span>
      ),
    },
    {
      title: t('common.brand'),
      dataIndex: 'brand',
      key: 'brand',
    },
    {
      title: t('common.category'),
      key: 'category',
      render: (_, record) => {
        const catName = record.subcategory_name || record.category_name || record.subcategory?.name || record.category?.name || '-';
        return <Tag>{catName}</Tag>;
      },
    },
    {
      title: t('common.quantity'),
      dataIndex: 'current_stock', // На бекенді часто current_stock або quantity
      key: 'quantity',
      render: (qty, record) => {
        // Підтримка обох назв полів
        const quantity = qty !== undefined ? qty : record.quantity;
        return (
            <Tag color={(quantity || 0) <= (record.min_stock_level || 0) ? 'red' : 'green'}>
            {quantity > 0 ? `${quantity} ${t('common.pcsShort')}` : t('inventory.noStock')}
            </Tag>
        );
      },
    },
    {
      title: t('inventory.salePrice'),
      dataIndex: 'selling_price',
      key: 'price',
      render: (price) => formatMoney(price),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size="middle" onClick={(e) => e.stopPropagation()}>
          <Button icon={<EyeOutlined />} onClick={() => navigate(`/inventory/${record.id}`)} />
          {record.marked_for_deletion ? (
            <Tooltip title={t('inventory.restore')}>
              <Button
                icon={<UndoOutlined />}
                onClick={() => handleUnmarkForDeletion(record.id)}
                style={{ color: '#52c41a', borderColor: '#52c41a' }}
              />
            </Tooltip>
          ) : (
            <>
              <Button icon={<EditOutlined />} onClick={() => navigate(`/inventory/${record.id}/edit`)} />
              <Popconfirm title={t('inventory.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
                <Button icon={<DeleteOutlined />} danger />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    { key: 'all', label: t('inventory.allProducts') },
    {
      key: 'low_stock',
      label: (
        <span>
          <WarningOutlined /> {t('inventory.lowStock')}
        </span>
      )
    },
    {
      key: 'wholesale',
      label: (
        <span>
          <DatabaseOutlined /> {t('inventory.wholesale')}
        </span>
      )
    },
    {
      key: 'order_list',
      label: (
        <span>
          <ShoppingCartOutlined /> {t('inventory.orderList')}
        </span>
      )
    },
  ];

  if (moduleUnavailable) return <ModuleUnavailableBanner moduleName={t('modules.inventory')} />;
  if (loading && products.length === 0 && activeTab !== 'order_list' && activeTab !== 'wholesale') return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title={t('inventory.title')}
        extra={
          activeTab !== 'order_list' && activeTab !== 'wholesale' && (
            <Space>
              <Input
                placeholder={t('inventory.searchPlaceholder')}
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 220 }}
                allowClear
              />

              <Select
                placeholder={t('common.category')}
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
                {showDeleted ? t('inventory.hideDeleted') : t('inventory.showDeleted')}
              </Button>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/inventory/new')}
              >
                {t('inventory.addProduct')}
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
              showTotal: (total, range) => `${range[0]}-${range[1]} ${t('common.of')} ${total}`
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
            description={activeTab === 'low_stock' ? t('inventory.lowStockEmpty') : t('inventory.emptyTitle')}
            buttonText={activeTab !== 'low_stock' ? t('inventory.addProduct') : null}
            onButtonClick={activeTab !== 'low_stock' ? () => navigate('/inventory/new') : undefined}
          />
        )}
      </Card>

    </div>
  );
}

export default InventoryPage;
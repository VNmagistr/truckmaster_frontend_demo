import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Tag, message, Table, Tabs, Modal, Space, Alert } from 'antd';
import { EditOutlined, WarningOutlined, DeleteOutlined, ExclamationCircleOutlined, UndoOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import { formatMoney, formatDateTime } from '../../utils/formatters';
import { UNITS } from '../../utils/constants';

function ProductDetailPage() {
  const { t } = useTranslation();
  const [product, setProduct] = useState(null);
  const [stockItems, setStockItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProductData();
  }, [id]);

  const fetchProductData = async () => {
    setLoading(true);
    try {
      const productData = await inventoryAPI.getProductById(id);
      setProduct(productData.data || productData);

      try {
        const stockData = await inventoryAPI.getStockByProduct(id);
        const stockParsed = stockData.data || stockData;
        setStockItems(stockParsed.results || stockParsed || []);
      } catch (e) {
        // залишки не завантажились — не критично
      }

      try {
        const movementsData = await inventoryAPI.getMovementsByProduct(id);
        const movementsParsed = movementsData.data || movementsData;
        setMovements(movementsParsed.results || movementsParsed || []);
      } catch (e) {
        // рухи не завантажились — не критично
      }
    } catch (error) {
      message.error(t('inventory.loadDetailError'));
      navigate('/inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: t('inventory.deleteConfirm'),
      icon: <ExclamationCircleOutlined />,
      content: `"${product.name}" ${t('inventory.deleteConfirmDesc')}`,
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await inventoryAPI.markForDeletion(id);
          message.success(t('inventory.deleteSuccess'));
          navigate('/inventory');
        } catch (error) {
          message.error(t('inventory.deleteError'));
        }
      },
    });
  };

  const handleUnmarkForDeletion = async () => {
    try {
      await inventoryAPI.unmarkForDeletion(id);
      message.success(t('inventory.restoreSuccess'));
      fetchProductData();
    } catch (error) {
      message.error(t('inventory.restoreError'));
    }
  };

  const stockColumns = [
    {
      title: t('inventory.warehouse'),
      dataIndex: 'warehouse_name',
      key: 'warehouse',
      render: (name, record) => name || record.warehouse?.name || '-',
    },
    {
      title: t('common.quantity'),
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: t('inventory.reserved'),
      dataIndex: 'reserved',
      key: 'reserved',
      render: (reserved) => reserved || 0,
    },
    {
      title: t('inventory.available'),
      dataIndex: 'available',
      key: 'available',
      render: (available, record) => available || (record.quantity - (record.reserved || 0)),
    },
    {
      title: t('inventory.location'),
      dataIndex: 'location',
      key: 'location',
      render: (loc) => loc || '-',
    },
  ];

  const movementsColumns = [
    {
      title: t('inventory.movementDate'),
      dataIndex: 'created_at',
      key: 'date',
      render: (date) => formatDateTime(date),
    },
    {
      title: t('inventory.movementType'),
      dataIndex: 'movement_type_display',
      key: 'type',
      render: (display, record) => {
        const typeColors = {
          in: 'green',
          out: 'red',
          transfer: 'blue',
          adjustment: 'orange',
        };
        return (
          <Tag color={typeColors[record.movement_type] || 'default'}>
            {display || record.movement_type}
          </Tag>
        );
      },
    },
    {
      title: t('inventory.movementQty'),
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: t('inventory.fromWarehouse'),
      dataIndex: 'warehouse_from_name',
      key: 'from',
      render: (name) => name || '-',
    },
    {
      title: t('inventory.toWarehouse'),
      dataIndex: 'warehouse_to_name',
      key: 'to',
      render: (name) => name || '-',
    },
    {
      title: t('common.notes'),
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes) => notes || '-',
    },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!product) {
    return null;
  }

  const isLowStock = product.current_stock <= (product.min_stock_level || 0);

  const tabItems = [
    {
      key: 'stock',
      label: t('inventory.stockByWarehouse', { count: stockItems.length }),
      children: (
        <Table
          columns={stockColumns}
          dataSource={stockItems}
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: t('inventory.noStockData') }}
        />
      ),
    },
    {
      key: 'movements',
      label: t('inventory.movementHistory', { count: movements.length }),
      children: (
        <Table
          columns={movementsColumns}
          dataSource={movements}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: t('inventory.noMovements') }}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={product.name}
        subtitle={product.sku_code}
        showBack
        extra={
          <Space wrap>
            {product.marked_for_deletion ? (
              <Button
                icon={<UndoOutlined />}
                onClick={handleUnmarkForDeletion}
                style={{ color: '#52c41a', borderColor: '#52c41a' }}
              >
                {t('inventory.restore')}
              </Button>
            ) : (
              <>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDelete}
                >
                  {t('common.delete')}
                </Button>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/inventory/${id}/edit`)}
                >
                  {t('common.edit')}
                </Button>
              </>
            )}
          </Space>
        }
      />

      {product.marked_for_deletion && (
        <Alert
          message={t('inventory.markedForDeletion')}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label={t('inventory.sku')}>
            <code>{product.sku_code}</code>
          </Descriptions.Item>
          <Descriptions.Item label={t('inventory.barcode')}>
            {product.barcode ? <code>{product.barcode}</code> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('common.brand')}>
            {product.brand || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('common.status')}>
            <Tag color={product.is_active ? 'green' : 'default'}>
              {product.is_active ? t('common.active') : t('common.inactive')}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('common.category')}>
            {product.subcategory_name || product.subcategory?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('inventory.viscosity')}>
            {product.viscosity || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('inventory.unit')}>
            {UNITS[product.unit]?.label || product.unit || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('inventory.costPrice')}>
            {formatMoney(product.cost_price)}
          </Descriptions.Item>
          <Descriptions.Item label={t('inventory.salePrice')}>
            <strong style={{ color: '#52c41a' }}>{formatMoney(product.selling_price)}</strong>
          </Descriptions.Item>
          <Descriptions.Item label={t('inventory.pricePerLiter')}>
            {product.price_per_liter ? formatMoney(product.price_per_liter) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('inventory.currentStock')}>
            <span style={{ color: isLowStock ? '#ff4d4f' : undefined, fontWeight: 500 }}>
              {product.current_stock || 0}
              {isLowStock && <WarningOutlined style={{ marginLeft: 8 }} />}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label={t('inventory.minStock')}>
            {product.min_stock_level || 0}
          </Descriptions.Item>
          <Descriptions.Item label={t('inventory.location')}>
            {product.address_in_stock || '-'}
          </Descriptions.Item>
        </Descriptions>

        {product.description && (
          <div style={{ marginTop: 16 }}>
            <strong>{t('common.description')}:</strong>
            <p style={{ marginTop: 8, color: '#666' }}>{product.description}</p>
          </div>
        )}

        {product.specifications && (
          <div style={{ marginTop: 16 }}>
            <strong>{t('inventory.specs')}:</strong>
            <p style={{ marginTop: 8, color: '#666' }}>{product.specifications}</p>
          </div>
        )}
      </Card>

      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}

export default ProductDetailPage;
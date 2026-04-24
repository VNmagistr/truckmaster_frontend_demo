import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Tag, message, Table, Tabs, Modal, Space, Alert } from 'antd';
import { EditOutlined, WarningOutlined, DeleteOutlined, ExclamationCircleOutlined, UndoOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import { formatMoney, formatDateTime } from '../../utils/formatters';
import { UNITS } from '../../utils/constants';

function ProductDetailPage() {
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
      message.error('Не вдалося завантажити дані товару');
      navigate('/inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Видалити товар?',
      icon: <ExclamationCircleOutlined />,
      content: `"${product.name}" буде позначено на видалення. Відновити можна через список складу.`,
      okText: 'Видалити',
      okType: 'danger',
      cancelText: 'Скасувати',
      onOk: async () => {
        try {
          await inventoryAPI.markForDeletion(id);
          message.success('Товар видалено');
          navigate('/inventory');
        } catch (error) {
          message.error('Не вдалося видалити товар');
        }
      },
    });
  };

  const handleUnmarkForDeletion = async () => {
    try {
      await inventoryAPI.unmarkForDeletion(id);
      message.success('Товар відновлено');
      fetchProductData();
    } catch (error) {
      message.error('Не вдалося відновити товар');
    }
  };

  const stockColumns = [
    {
      title: 'Склад',
      dataIndex: 'warehouse_name',
      key: 'warehouse',
      render: (name, record) => name || record.warehouse?.name || '-',
    },
    {
      title: 'Кількість',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Зарезервовано',
      dataIndex: 'reserved',
      key: 'reserved',
      render: (reserved) => reserved || 0,
    },
    {
      title: 'Доступно',
      dataIndex: 'available',
      key: 'available',
      render: (available, record) => available || (record.quantity - (record.reserved || 0)),
    },
    {
      title: 'Місце',
      dataIndex: 'location',
      key: 'location',
      render: (loc) => loc || '-',
    },
  ];

  const movementsColumns = [
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'date',
      render: (date) => formatDateTime(date),
    },
    {
      title: 'Тип',
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
      title: 'Кількість',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Зі складу',
      dataIndex: 'warehouse_from_name',
      key: 'from',
      render: (name) => name || '-',
    },
    {
      title: 'На склад',
      dataIndex: 'warehouse_to_name',
      key: 'to',
      render: (name) => name || '-',
    },
    {
      title: 'Примітки',
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
      label: `Залишки по складах (${stockItems.length})`,
      children: (
        <Table
          columns={stockColumns}
          dataSource={stockItems}
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'Немає даних по складах' }}
        />
      ),
    },
    {
      key: 'movements',
      label: `Історія руху (${movements.length})`,
      children: (
        <Table
          columns={movementsColumns}
          dataSource={movements}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'Немає історії руху' }}
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
                Відновити
              </Button>
            ) : (
              <>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDelete}
                >
                  Видалити
                </Button>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/inventory/${id}/edit`)}
                >
                  Редагувати
                </Button>
              </>
            )}
          </Space>
        }
      />

      {product.marked_for_deletion && (
        <Alert
          message="Цей товар позначено на видалення"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="Артикул">
            <code>{product.sku_code}</code>
          </Descriptions.Item>
          <Descriptions.Item label="Штрих-код">
            {product.barcode ? <code>{product.barcode}</code> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Бренд">
            {product.brand || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Статус">
            <Tag color={product.is_active ? 'green' : 'default'}>
              {product.is_active ? 'Активний' : 'Неактивний'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Категорія">
            {product.subcategory_name || product.subcategory?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="В'язкість">
            {product.viscosity || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Одиниця виміру">
            {UNITS[product.unit]?.label || product.unit || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Собівартість">
            {formatMoney(product.cost_price)}
          </Descriptions.Item>
          <Descriptions.Item label="Ціна продажу">
            <strong style={{ color: '#52c41a' }}>{formatMoney(product.selling_price)}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Ціна за літр">
            {product.price_per_liter ? formatMoney(product.price_per_liter) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Поточний залишок">
            <span style={{ color: isLowStock ? '#ff4d4f' : undefined, fontWeight: 500 }}>
              {product.current_stock || 0}
              {isLowStock && <WarningOutlined style={{ marginLeft: 8 }} />}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Мінімальний залишок">
            {product.min_stock_level || 0}
          </Descriptions.Item>
          <Descriptions.Item label="Місце на складі">
            {product.address_in_stock || '-'}
          </Descriptions.Item>
        </Descriptions>

        {product.description && (
          <div style={{ marginTop: 16 }}>
            <strong>Опис:</strong>
            <p style={{ marginTop: 8, color: '#666' }}>{product.description}</p>
          </div>
        )}

        {product.specifications && (
          <div style={{ marginTop: 16 }}>
            <strong>Специфікації:</strong>
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
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Space, Select, InputNumber, Switch, Row, Col, Modal } from 'antd';
import { SaveOutlined, DeleteOutlined, ExclamationCircleOutlined, ScanOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import BarcodeScanner from '../../components/BarcodeScanner';
import { UNITS } from '../../utils/constants';

function ProductFormPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Ініціалізуємо як масиви
  const [categories, setCategories] = useState([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [deleting, setDeleting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleBarcodeDetected = (code) => {
    form.setFieldsValue({ barcode: code });
    setIsScannerOpen(false);
    message.success(`${t('inventory.barcodeRecognized')} ${code}`);
  };

  useEffect(() => {
    fetchCategories();
    if (isEdit) fetchProduct();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const categoriesRes = await inventoryAPI.getCategories();
      const catData = categoriesRes.data || categoriesRes;
      const catList = Array.isArray(catData) ? catData : (catData.results || []);
      setCategories(catList);
    } catch {
      // не критично
    }
  };

  const fetchSubcategoriesByCategory = async (categoryId) => {
    setSubcategoriesLoading(true);
    try {
      const res = await inventoryAPI.getSubcategories({ category: categoryId, page_size: 1000 });
      const data = res.data || res;
      setFilteredSubcategories(Array.isArray(data) ? data : (data.results || []));
    } catch {
      setFilteredSubcategories([]);
    } finally {
      setSubcategoriesLoading(false);
    }
  };

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await inventoryAPI.getProductById(id);
      const data = response.data || response;

      const subcategoryId = typeof data.subcategory === 'object'
        ? data.subcategory?.id
        : data.subcategory;

      form.setFieldsValue({ ...data, subcategory: subcategoryId });

      // Завантажуємо підкатегорію з сервера, щоб отримати батьківську категорію
      if (subcategoryId) {
        const subRes = await inventoryAPI.getSubcategoryById(subcategoryId);
        const subData = subRes.data || subRes;
        if (subData?.category) {
          form.setFieldsValue({ category_filter: subData.category });
          await fetchSubcategoriesByCategory(subData.category);
        }
      }

    } catch {
      message.error(t('inventory.loadDetailError'));
      navigate('/inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId) => {
    form.setFieldsValue({ subcategory: null });
    if (categoryId) {
      fetchSubcategoriesByCategory(categoryId);
    } else {
      setFilteredSubcategories([]);
    }
  };

  const onFinish = async (values) => {
    setSaving(true);
    try {
      // Очищаємо дані від віртуальних полів перед відправкою
      const cleanValues = { ...values };
      delete cleanValues.category_filter; // Це поле тільки для UI, серверу воно не треба

      if (isEdit) {
        await inventoryAPI.updateProduct(id, cleanValues);
        message.success(t('inventory.updateSuccess'));
      } else {
        await inventoryAPI.createProduct(cleanValues);
        message.success(t('inventory.createSuccess'));
      }
      navigate('/inventory');
    } catch (error) {
      if (error.response?.data) {
        const errors = error.response.data;
        // Виводимо помилки гарно
        if (typeof errors === 'object') {
             Object.keys(errors).forEach(key => {
               const msg = Array.isArray(errors[key]) ? errors[key].join(', ') : errors[key];
               message.error(`${key}: ${msg}`);
             });
        } else {
            message.error(`Помилка: ${JSON.stringify(errors)}`);
        }
      } else if (error.response?.status === 405) {
         message.error(t('inventory.saveError'));
      } else {
        message.error(t('inventory.saveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: t('inventory.deleteConfirm'),
      icon: <ExclamationCircleOutlined />,
      content: t('inventory.deleteConfirmDesc'),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        setDeleting(true);
        try {
          await inventoryAPI.markForDeletion(id);
          message.success(t('inventory.deleteSuccess'));
          navigate('/inventory');
        } catch (error) {
          message.error(t('inventory.deleteError'));
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title={isEdit ? t('inventory.editProduct') : t('inventory.newProduct')}
        showBack
        extra={isEdit && (
          <Button
            danger
            icon={<DeleteOutlined />}
            loading={deleting}
            onClick={handleDelete}
          >
            {t('common.delete')}
          </Button>
        )}
      />

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            is_active: true,
            unit: 'pcs',
            current_stock: 0,
            min_stock_level: 0,
            cost_price: 0,
            selling_price: 0,
          }}
        >
          <Row gutter={24}>
            <Col xs={24} md={8}>
              <Form.Item
                name="sku_code"
                label={t('inventory.sku')}
                rules={[{ required: true, message: t('inventory.skuPlaceholder') }]}
              >
                <Input placeholder={t('inventory.skuHelp')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="barcode"
                label={t('inventory.barcode')}
              >
                <Input
                  placeholder={t('inventory.barcodePlaceholder')}
                  addonAfter={
                    <ScanOutlined
                      onClick={() => setIsScannerOpen(true)}
                      style={{ cursor: 'pointer', color: '#1a1a1a' }}
                      title={t('inventory.scanCamera')}
                    />
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="brand"
                label={t('common.brand')}
              >
                <Input placeholder={t('inventory.brandPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="name"
            label={t('common.name')}
            rules={[{ required: true, message: t('inventory.namePlaceholder') }]}
          >
            <Input placeholder={t('inventory.nameHelp')} />
          </Form.Item>

          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={3} placeholder={t('inventory.descriptionPlaceholder')} />
          </Form.Item>

          <Row gutter={24}>
            <Col xs={24} md={8}>
              <Form.Item
                name="category_filter"
                label={t('common.category')}
              >
                <Select
                  placeholder={t('inventory.selectCategory')}
                  allowClear
                  onChange={handleCategoryChange}
                >
                  {categories.map(cat => (
                    <Select.Option key={cat.id} value={cat.id}>
                      {cat.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="subcategory"
                label={t('inventory.subcategory')}
              >
                <Select placeholder={t('inventory.selectSubcategory')} allowClear loading={subcategoriesLoading}>
                  {filteredSubcategories.map(sub => (
                    <Select.Option key={sub.id} value={sub.id}>
                      {sub.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="viscosity" label={t('inventory.viscosity')}>
                <Input placeholder={t('inventory.viscosityPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={6}>
              <Form.Item name="unit" label={t('inventory.unit')}>
                <Select>
                  {Object.values(UNITS).map(unit => (
                    <Select.Option key={unit.value} value={unit.value}>
                      {unit.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="cost_price" label={t('inventory.costPrice')}>
                <InputNumber style={{ width: '100%' }} min={0} precision={2} addonAfter={t('common.uah')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="selling_price" label={t('inventory.salePrice')} rules={[{ required: true, message: t('inventory.pricePlaceholder') }]}>
                <InputNumber style={{ width: '100%' }} min={0} precision={2} addonAfter={t('common.uah')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="volume_per_unit" label={t('inventory.volumePerPack')}>
                <InputNumber style={{ width: '100%' }} min={0} precision={2} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={8}>
              <Form.Item name="current_stock" label={t('inventory.currentStock')}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="min_stock_level" label={t('inventory.minStock')}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="address_in_stock" label={t('inventory.location')}>
                <Input placeholder={t('inventory.locationPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="specifications" label={t('inventory.specs')}>
            <Input.TextArea rows={2} placeholder={t('inventory.specsPlaceholder')} />
          </Form.Item>

          <Form.Item name="notes" label={t('common.notes')}>
            <Input.TextArea rows={2} placeholder={t('inventory.notesPlaceholder')} />
          </Form.Item>

          <Form.Item name="is_active" label={t('inventory.isActive')} valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                {isEdit ? t('common.saveChanges') : t('inventory.createProduct')}
              </Button>
              <Button onClick={() => navigate('/inventory')}>{t('common.cancel')}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <BarcodeScanner
        open={isScannerOpen}
        onDetected={handleBarcodeDetected}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
}

export default ProductFormPage;
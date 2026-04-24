import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Space, Select, InputNumber, Switch, Row, Col, Modal } from 'antd';
import { SaveOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import { UNITS } from '../../utils/constants';

function ProductFormPage() {
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
      message.error('Не вдалося завантажити дані товару');
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
        message.success('Товар успішно оновлено');
      } else {
        await inventoryAPI.createProduct(cleanValues);
        message.success('Товар успішно створено');
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
         message.error('Помилка 405: Створення заборонено сервером. Оновіть inventory/views.py');
      } else {
        message.error('Не вдалося зберегти товар');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Видалити товар?',
      icon: <ExclamationCircleOutlined />,
      content: 'Товар буде видалено без можливості відновлення.',
      okText: 'Видалити',
      okType: 'danger',
      cancelText: 'Скасувати',
      onOk: async () => {
        setDeleting(true);
        try {
          await inventoryAPI.markForDeletion(id);
          message.success('Товар видалено');
          navigate('/inventory');
        } catch (error) {
          message.error('Не вдалося видалити товар');
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
        title={isEdit ? 'Редагувати товар' : 'Новий товар'}
        showBack
        extra={isEdit && (
          <Button
            danger
            icon={<DeleteOutlined />}
            loading={deleting}
            onClick={handleDelete}
          >
            Видалити
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
                label="Артикул"
                rules={[{ required: true, message: 'Введіть артикул' }]}
              >
                <Input placeholder="Унікальний код товару" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="barcode"
                label="Штрих-код"
              >
                <Input placeholder="Штрих-код (EAN/UPC)" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="brand"
                label="Бренд"
              >
                <Input placeholder="Виробник" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="name"
            label="Назва"
            rules={[{ required: true, message: 'Введіть назву товару' }]}
          >
            <Input placeholder="Повна назва товару" />
          </Form.Item>

          <Form.Item name="description" label="Опис">
            <Input.TextArea rows={3} placeholder="Опис товару" />
          </Form.Item>

          <Row gutter={24}>
            <Col xs={24} md={8}>
              <Form.Item
                name="category_filter"
                label="Категорія"
              >
                <Select
                  placeholder="Оберіть категорію"
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
                label="Підкатегорія"
              >
                <Select placeholder="Оберіть підкатегорію" allowClear loading={subcategoriesLoading}>
                  {filteredSubcategories.map(sub => (
                    <Select.Option key={sub.id} value={sub.id}>
                      {sub.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="viscosity" label="В'язкість (для олив)">
                <Input placeholder="5W-30, 10W-40, тощо" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={6}>
              <Form.Item name="unit" label="Одиниця виміру">
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
              <Form.Item name="cost_price" label="Собівартість">
                <InputNumber style={{ width: '100%' }} min={0} precision={2} addonAfter="грн" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="selling_price" label="Ціна продажу" rules={[{ required: true, message: 'Введіть ціну' }]}>
                <InputNumber style={{ width: '100%' }} min={0} precision={2} addonAfter="грн" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="volume_per_unit" label="Об'єм в упаковці (л)">
                <InputNumber style={{ width: '100%' }} min={0} precision={2} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={8}>
              <Form.Item name="current_stock" label="Поточний залишок">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="min_stock_level" label="Мінімальний залишок">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="address_in_stock" label="Місце на складі">
                <Input placeholder="Полиця, секція" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="specifications" label="Специфікації">
            <Input.TextArea rows={2} placeholder="Технічні характеристики" />
          </Form.Item>

          <Form.Item name="notes" label="Примітки">
            <Input.TextArea rows={2} placeholder="Додаткові примітки" />
          </Form.Item>

          <Form.Item name="is_active" label="Активний" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                {isEdit ? 'Зберегти зміни' : 'Створити товар'}
              </Button>
              <Button onClick={() => navigate('/inventory')}>Скасувати</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default ProductFormPage;
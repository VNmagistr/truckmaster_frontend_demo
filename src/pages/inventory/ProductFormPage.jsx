import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Space, Select, InputNumber, Switch, Row, Col } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { inventoryAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import { UNITS } from '../../utils/constants';

function ProductFormPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Ініціалізуємо як масиви, щоб уникнути map errors
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState([]);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  useEffect(() => {
    // Спочатку вантажимо категорії, потім (якщо треба) товар
    fetchCategories().then(() => {
        if (isEdit) {
            fetchProduct();
        }
    });
  }, [id]);

  const fetchCategories = async () => {
    try {
      const [categoriesRes, subcategoriesRes] = await Promise.all([
        inventoryAPI.getCategories().catch(() => []),
        inventoryAPI.getSubcategories().catch(() => []),
      ]);

      // 🔥 ВИПРАВЛЕННЯ: Безпечна розпаковка даних
      
      // 1. Категорії
      const catData = categoriesRes.data || categoriesRes; // Дістаємо .data з Axios
      const catList = catData.results || catData || [];    // Дістаємо .results з пагінації (якщо є)
      setCategories(Array.isArray(catList) ? catList : []);

      // 2. Підкатегорії
      const subData = subcategoriesRes.data || subcategoriesRes;
      const subList = subData.results || subData || [];
      const safeSubs = Array.isArray(subList) ? subList : [];
      
      setSubcategories(safeSubs);
      setFilteredSubcategories(safeSubs);

    } catch (error) {
      console.error('Error fetching categories:', error);
      // Не кидаємо помилку користувачу, щоб форма все одно відкрилась
    }
  };

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await inventoryAPI.getProductById(id);
      const data = response.data || response;
      
      form.setFieldsValue({
        ...data,
        subcategory: data.subcategory?.id || data.subcategory,
      });
      
      // Якщо у товару є категорія, фільтруємо підкатегорії
      // (data.subcategory може бути об'єктом або ID, тому перевіряємо)
      if (data.subcategory && typeof data.subcategory === 'object' && data.subcategory.category) {
         handleCategoryChange(data.subcategory.category);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      message.error('Не вдалося завантажити дані товару');
      navigate('/inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId) => {
    // Скидаємо поле підкатегорії при зміні категорії
    // form.setFieldsValue({ subcategory: null }); 

    if (categoryId) {
      const filtered = subcategories.filter(sub => sub.category === categoryId);
      setFilteredSubcategories(filtered);
    } else {
      setFilteredSubcategories(subcategories);
    }
  };

  const onFinish = async (values) => {
    setSaving(true);
    try {
      if (isEdit) {
        await inventoryAPI.updateProduct(id, values);
        message.success('Товар успішно оновлено');
      } else {
        await inventoryAPI.createProduct(values);
        message.success('Товар успішно створено');
      }
      navigate('/inventory');
    } catch (error) {
      console.error('Error saving product:', error);
      if (error.response?.data) {
        const errors = error.response.data;
        Object.keys(errors).forEach(key => {
          // Якщо помилка - масив, з'єднуємо в рядок
          const msg = Array.isArray(errors[key]) ? errors[key].join(', ') : errors[key];
          message.error(`${key}: ${msg}`);
        });
      } else {
        message.error('Не вдалося зберегти товар');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Редагувати товар' : 'Новий товар'}
        showBack
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
            <Col xs={24} md={12}>
              <Form.Item
                name="sku_code"
                label="Артикул"
                rules={[{ required: true, message: 'Введіть артикул' }]}
              >
                <Input placeholder="Унікальний код товару" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
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

          <Form.Item
            name="description"
            label="Опис"
          >
            <Input.TextArea rows={3} placeholder="Опис товару" />
          </Form.Item>

          <Row gutter={24}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Категорія"
                name="category_filter" // Це віртуальне поле для фільтрації, не відправляємо на сервер
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
                <Select placeholder="Оберіть підкатегорію" allowClear>
                  {filteredSubcategories.map(sub => (
                    <Select.Option key={sub.id} value={sub.id}>
                      {sub.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="viscosity"
                label="В'язкість (для олив)"
              >
                <Input placeholder="5W-30, 10W-40, тощо" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={6}>
              <Form.Item
                name="unit"
                label="Одиниця виміру"
              >
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
              <Form.Item
                name="cost_price"
                label="Собівартість"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  addonAfter="грн"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="selling_price"
                label="Ціна продажу"
                rules={[{ required: true, message: 'Введіть ціну' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  addonAfter="грн"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="volume_per_unit"
                label="Об'єм в упаковці (л)"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={8}>
              <Form.Item
                name="current_stock"
                label="Поточний залишок"
              >
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="min_stock_level"
                label="Мінімальний залишок"
              >
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="address_in_stock"
                label="Місце на складі"
              >
                <Input placeholder="Полиця, секція" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="specifications"
            label="Специфікації"
          >
            <Input.TextArea rows={2} placeholder="Технічні характеристики" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Примітки"
          >
            <Input.TextArea rows={2} placeholder="Додаткові примітки" />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Активний"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={<SaveOutlined />}
              >
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
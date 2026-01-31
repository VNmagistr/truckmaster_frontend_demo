import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Space, Select } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { trucksAPI, clientsAPI, baseModelsAPI } from '../../api'; // Переконайся, що baseModelsAPI тут є
import { PageHeader, LoadingSpinner } from '../../components';
import { EURO_STANDARDS } from '../../utils/constants';

function TruckFormPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [baseModels, setBaseModels] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  useEffect(() => {
    fetchDictionaryData();
  }, []); // Завантажуємо довідники одразу

  // Об'єднуємо завантаження довідників
  const fetchDictionaryData = async () => {
    try {
      const [clientsResp, baseModelsResp] = await Promise.all([
        clientsAPI.getAll({ page_size: 100 }), // Беремо перші 100 клієнтів
        baseModelsAPI.getAll()
      ]);

      // Розпаковка клієнтів
      const clientsData = clientsResp.data || clientsResp;
      setClients(clientsData.results || clientsData || []);

      // Розпаковка моделей
      const modelsData = baseModelsResp.data || baseModelsResp;
      setBaseModels(modelsData.results || modelsData || []);

      // Тільки коли довідники завантажені, вантажимо дані вантажівки (якщо це редагування)
      if (isEdit) {
        fetchTruck();
      }
    } catch (error) {
      console.error('Error fetching dictionaries:', error);
      message.error('Не вдалося завантажити списки');
    }
  };

  const fetchTruck = async () => {
    setLoading(true);
    try {
      const response = await trucksAPI.getById(id);
      const data = response.data || response;
      
      console.log("Truck Data:", data); // Для дебагу

      // Підготовка даних для форми
      // Важливо: перевіряємо, чи прийшов об'єкт, чи ID
      form.setFieldsValue({
        ...data,
        client: data.client?.id || data.client, // Якщо об'єкт - беремо ID, якщо ID - лишаємо ID
        base_model: data.base_model?.id || data.base_model,
      });
    } catch (error) {
      console.error('Error fetching truck:', error);
      message.error('Не вдалося завантажити дані вантажівки');
      navigate('/trucks');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    setSaving(true);
    try {
      if (isEdit) {
        await trucksAPI.update(id, values);
        message.success('Вантажівку успішно оновлено');
      } else {
        await trucksAPI.create(values);
        message.success('Вантажівку успішно створено');
      }
      navigate('/trucks');
    } catch (error) {
      console.error('Error saving truck:', error);
      if (error.response?.data) {
        const errors = error.response.data;
        Object.keys(errors).forEach(key => {
          message.error(`${key}: ${errors[key]}`);
        });
      } else {
        message.error('Не вдалося зберегти вантажівку');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  // Фільтрація клієнтів для пошуку в Select
  const filterOption = (input, option) =>
    (option?.children ?? '').toLowerCase().includes(input.toLowerCase());

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Редагувати вантажівку' : 'Нова вантажівка'}
        showBack
      />

      <Card style={{ maxWidth: 600 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="license_plate"
            label="Номерний знак"
            rules={[{ required: true, message: 'Введіть номерний знак' }]}
          >
            <Input placeholder="AA0000BB" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            name="full_vin"
            label="Повний VIN код"
            rules={[
              { required: true, message: 'Введіть VIN код' },
              { len: 17, message: 'VIN код має містити 17 символів' },
            ]}
          >
            <Input placeholder="17 символів" maxLength={17} style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            name="specific_model_name"
            label="Модель (уточнення)"
            rules={[{ required: true, message: 'Введіть модель' }]}
          >
            <Input placeholder="Наприклад: 35C15, 70C17" />
          </Form.Item>

          <Form.Item
            name="base_model"
            label="Базова модель"
          >
            <Select placeholder="Оберіть базову модель" allowClear>
              {baseModels.map(model => (
                <Select.Option key={model.id} value={model.id}>
                  {model.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="euro_standard"
            label="Євростандарт"
          >
            <Select placeholder="Оберіть євростандарт" allowClear>
              {Object.values(EURO_STANDARDS).map(euro => (
                <Select.Option key={euro.value} value={euro.value}>
                  {euro.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="client"
            label="Власник"
          >
            <Select
              placeholder="Оберіть власника"
              allowClear
              showSearch
              filterOption={filterOption}
            >
              {clients.map(client => (
                <Select.Option key={client.id} value={client.id}>
                  {client.name} {client.phone ? `(${client.phone})` : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={<SaveOutlined />}
              >
                {isEdit ? 'Зберегти зміни' : 'Створити вантажівку'}
              </Button>
              <Button onClick={() => navigate('/trucks')}>Скасувати</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default TruckFormPage;